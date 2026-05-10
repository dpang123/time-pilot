/**
 * Tiny synthesizer using the Web Audio API. All sound effects are generated
 * on the fly from oscillators + noise — no audio assets are bundled, which
 * keeps the build small and avoids licensing concerns.
 *
 * Browsers block AudioContext until a user gesture; the game forces a resume
 * inside the first input handler in MenuScene/GameScene via `unlock()`.
 */

type SfxKey =
  | 'fire'
  | 'enemyFire'
  | 'enemyExplode'
  | 'playerExplode'
  | 'motherHit'
  | 'motherExplode'
  | 'motherWarn'
  | 'pilot'
  | 'eraStart'
  | '1up';

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  private ensure(): boolean {
    if (this.ctx) return true;
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return false;
      this.ctx = new Ctor();
      const ctx = this.ctx!;
      this.master = ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(ctx.destination);
      // Restore mute preference.
      try {
        if (localStorage.getItem('timepilot.muted') === '1') this.muted = true;
      } catch {
        /* ignore */
      }
      this.applyMute();
      return true;
    } catch {
      return false;
    }
  }

  /** Resume the AudioContext from a user gesture (autoplay-policy compliance). */
  unlock(): void {
    if (!this.ensure()) return;
    if (this.ctx!.state === 'suspended') this.ctx!.resume().catch(() => {});
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('timepilot.muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
    this.applyMute();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private applyMute(): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
  }

  /** Schedule a one-shot tone. Returns silently if audio is unavailable. */
  private tone(opts: {
    type: OscillatorType;
    freq: number;
    freqEnd?: number;
    duration: number; // seconds
    volume?: number;
    delay?: number;
  }): void {
    if (!this.ensure() || this.muted) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, opts.freqEnd),
        now + opts.duration,
      );
    }
    const vol = opts.volume ?? 0.3;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
    osc.connect(g).connect(this.master!);
    osc.start(now);
    osc.stop(now + opts.duration + 0.02);
  }

  /** Schedule a short noise burst — used for explosions. */
  private noise(opts: { duration: number; volume?: number; delay?: number; lowPassHz?: number }): void {
    if (!this.ensure() || this.muted) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime + (opts.delay ?? 0);
    const samples = Math.floor(ctx.sampleRate * opts.duration);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.lowPassHz ?? 1800;
    const vol = opts.volume ?? 0.4;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(now);
    src.stop(now + opts.duration + 0.02);
  }

  // ---- Public sound effects ----

  play(key: SfxKey): void {
    switch (key) {
      case 'fire':
        this.tone({ type: 'square', freq: 880, freqEnd: 220, duration: 0.07, volume: 0.18 });
        break;
      case 'enemyFire':
        this.tone({ type: 'sawtooth', freq: 520, freqEnd: 180, duration: 0.09, volume: 0.14 });
        break;
      case 'enemyExplode':
        this.noise({ duration: 0.22, volume: 0.4, lowPassHz: 1200 });
        this.tone({ type: 'square', freq: 220, freqEnd: 60, duration: 0.18, volume: 0.18 });
        break;
      case 'playerExplode':
        this.noise({ duration: 0.6, volume: 0.55, lowPassHz: 900 });
        this.tone({ type: 'square', freq: 320, freqEnd: 40, duration: 0.5, volume: 0.22 });
        break;
      case 'motherHit':
        this.tone({ type: 'square', freq: 140, freqEnd: 90, duration: 0.08, volume: 0.18 });
        break;
      case 'motherExplode':
        for (let i = 0; i < 6; i++) {
          this.noise({ duration: 0.35, volume: 0.55, lowPassHz: 800, delay: i * 0.09 });
          this.tone({
            type: 'square',
            freq: 280 - i * 30,
            freqEnd: 50,
            duration: 0.3,
            volume: 0.22,
            delay: i * 0.09,
          });
        }
        break;
      case 'motherWarn':
        for (let i = 0; i < 3; i++) {
          this.tone({
            type: 'square',
            freq: 880,
            freqEnd: 660,
            duration: 0.18,
            volume: 0.22,
            delay: i * 0.22,
          });
        }
        break;
      case 'pilot':
        // Rising 3-note jingle.
        this.tone({ type: 'triangle', freq: 660, duration: 0.09, volume: 0.22 });
        this.tone({ type: 'triangle', freq: 880, duration: 0.09, volume: 0.22, delay: 0.09 });
        this.tone({ type: 'triangle', freq: 1320, duration: 0.16, volume: 0.24, delay: 0.18 });
        break;
      case 'eraStart':
        // 4-note fanfare.
        const notes = [523, 659, 784, 1046];
        notes.forEach((f, i) =>
          this.tone({ type: 'square', freq: f, duration: 0.12, volume: 0.22, delay: i * 0.12 }),
        );
        break;
      case '1up':
        // Coin-up arpeggio.
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone({ type: 'triangle', freq: f, duration: 0.08, volume: 0.22, delay: i * 0.06 }),
        );
        break;
    }
  }
}

/** Singleton instance shared across scenes. */
export const synth = new Synth();
