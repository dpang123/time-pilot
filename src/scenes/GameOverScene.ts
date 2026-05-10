import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import {
  SessionToken,
  submitScore,
  pushLocalScore,
} from '../net/leaderboard';

interface GameOverData {
  score: number;
  eraReached?: string;
  loop?: number;
  session?: SessionToken | null;
  durationMs?: number;
}

const NAME_KEY = 'timepilot.lastName';
const EMAIL_KEY = 'timepilot.lastEmail';

/**
 * Game-over screen with optional online leaderboard submission.
 *
 * The form is built from native DOM <input> elements positioned over the
 * Phaser canvas — much simpler than implementing a custom in-canvas keyboard,
 * and gives us the OS keyboard / autofill on mobile for free.
 */
export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  private eraReached = '';
  private loop = 0;
  private session: SessionToken | null = null;
  private durationMs = 0;

  private domContainer: HTMLDivElement | null = null;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.finalScore = data?.score ?? 0;
    this.eraReached = data?.eraReached ?? '';
    this.loop = data?.loop ?? 0;
    this.session = data?.session ?? null;
    this.durationMs = data?.durationMs ?? 0;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.12, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff5555',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.22, `FINAL SCORE  ${this.finalScore}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    if (this.eraReached) {
      this.add
        .text(
          cx,
          GAME_HEIGHT * 0.28,
          `REACHED  ${this.eraReached}${this.loop > 0 ? `  LOOP ${this.loop + 1}` : ''}`,
          {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffff66',
          },
        )
        .setOrigin(0.5);
    }

    this.buildForm();

    this.statusText = this.add
      .text(cx, GAME_HEIGHT - 32, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 20 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 14, 'ESC  SKIP TO MENU', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#666666',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ESC', () => this.goToMenu());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupForm());
  }

  private buildForm(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -10%);
      width: min(90vw, 320px);
      font-family: 'Courier New', monospace;
      color: #fff;
      text-align: center;
      z-index: 9999;
      pointer-events: auto;
    `;

    const lastName = readStorage(NAME_KEY);
    const lastEmail = readStorage(EMAIL_KEY);

    container.innerHTML = `
      <div style="font-size:11px; color:#ffff66; margin-bottom:6px;">SUBMIT TO ONLINE LEADERBOARD</div>
      <input id="tp-name"  type="text"  placeholder="NAME (1-12)" maxlength="12" autocomplete="nickname"
             value="${escapeAttr(lastName)}"
             style="${inputStyle()}; text-transform:uppercase;" />
      <input id="tp-email" type="email" placeholder="EMAIL (optional)" maxlength="254" autocomplete="email"
             value="${escapeAttr(lastEmail)}"
             style="${inputStyle()}" />
      <label style="display:block; font-size:10px; color:#aaa; margin-top:4px; line-height:1.4;">
        <input id="tp-optin" type="checkbox" style="vertical-align:middle;" />
        Email me updates about this game
      </label>
      <p style="font-size:8px; color:#888; margin:6px 0 8px; line-height:1.5;">
        Your email is stored privately, never shown on the leaderboard,
        and only used to contact you about this game. We never share or sell it.
      </p>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button id="tp-submit" style="${buttonStyle('#22aa55')}">SUBMIT</button>
        <button id="tp-skip"   style="${buttonStyle('#444444')}">SKIP</button>
      </div>
    `;

    document.body.appendChild(container);
    this.domContainer = container;

    const nameEl = container.querySelector<HTMLInputElement>('#tp-name')!;
    const emailEl = container.querySelector<HTMLInputElement>('#tp-email')!;
    const optEl = container.querySelector<HTMLInputElement>('#tp-optin')!;
    const submitEl = container.querySelector<HTMLButtonElement>('#tp-submit')!;
    const skipEl = container.querySelector<HTMLButtonElement>('#tp-skip')!;

    setTimeout(() => nameEl.focus(), 50);

    skipEl.addEventListener('click', () => this.goToMenu());

    submitEl.addEventListener('click', async () => {
      submitEl.disabled = true;
      skipEl.disabled = true;
      const name = nameEl.value.trim();
      const email = emailEl.value.trim();
      const optInEmail = optEl.checked && email.length > 0;

      if (!/^[A-Za-z0-9 _\-]{1,12}$/.test(name)) {
        this.statusText.setText('NAME MUST BE 1-12 LETTERS / DIGITS');
        submitEl.disabled = false;
        skipEl.disabled = false;
        return;
      }
      if (optInEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.statusText.setText('EMAIL ADDRESS LOOKS INVALID');
        submitEl.disabled = false;
        skipEl.disabled = false;
        return;
      }

      writeStorage(NAME_KEY, name);
      if (optInEmail) writeStorage(EMAIL_KEY, email);

      // Always cache locally as a fallback.
      pushLocalScore({
        name,
        score: this.finalScore,
        era: this.eraReached,
        loop: this.loop,
        playedAt: Date.now(),
      });

      if (!this.session) {
        this.statusText.setText('OFFLINE: SAVED LOCALLY');
        this.time.delayedCall(900, () => this.goToLeaderboard());
        return;
      }

      this.statusText.setText('SUBMITTING...');
      const res = await submitScore({
        session: this.session,
        name,
        score: this.finalScore,
        eraReached: this.eraReached,
        loop: this.loop,
        durationMs: this.durationMs,
        optInEmail,
        email: optInEmail ? email : undefined,
      });

      if (res.ok) {
        this.statusText.setText(
          res.rank ? `RANKED #${res.rank} GLOBALLY!` : 'SUBMITTED!',
        );
        this.time.delayedCall(1100, () => this.goToLeaderboard());
      } else {
        this.statusText.setText(`ERROR: ${res.error ?? 'unknown'}`);
        submitEl.disabled = false;
        skipEl.disabled = false;
      }
    });
  }

  private cleanupForm(): void {
    if (this.domContainer && this.domContainer.parentNode) {
      this.domContainer.parentNode.removeChild(this.domContainer);
    }
    this.domContainer = null;
  }

  private goToMenu(): void {
    this.cleanupForm();
    this.scene.start('MenuScene');
  }

  private goToLeaderboard(): void {
    this.cleanupForm();
    this.scene.start('LeaderboardScene');
  }
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function inputStyle(): string {
  return `
    display:block; width:100%; box-sizing:border-box;
    margin:4px 0; padding:6px 8px;
    font-family:'Courier New',monospace; font-size:14px;
    background:#111; color:#fff; border:1px solid #555; border-radius:2px;
  `;
}

function buttonStyle(color: string): string {
  return `
    flex:1; padding:8px 10px;
    font-family:'Courier New',monospace; font-size:12px; font-weight:bold;
    background:${color}; color:#fff; border:none; border-radius:2px;
    cursor:pointer;
  `;
}
