import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import {
  fetchTopScores,
  readLocalScores,
  LeaderboardEntry,
} from '../net/leaderboard';

/**
 * Top-10 leaderboard. Tries the online API first; on failure shows the
 * local cached scores so the player still sees something.
 */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  async create(): Promise<void> {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 14, 'TOP 10', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffff00',
      })
      .setOrigin(0.5);

    const loading = this.add
      .text(cx, GAME_HEIGHT / 2, 'LOADING...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 14, 'PRESS SPACE OR TAP TO RETURN', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('MenuScene'));
    this.input.once('pointerdown', () => this.scene.start('MenuScene'));

    const online = await fetchTopScores();
    loading.destroy();
    if (online && online.length > 0) {
      this.renderEntries(online, false);
      return;
    }

    // Fallback: local-only history.
    const local = readLocalScores().map<LeaderboardEntry>((s, i) => ({
      rank: i + 1,
      name: s.name,
      score: s.score,
      era: s.era,
      loop: s.loop,
      playedAt: s.playedAt,
    }));
    if (local.length > 0) {
      this.add
        .text(cx, 30, '(LOCAL DEVICE ONLY)', {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#aa6666',
        })
        .setOrigin(0.5);
      this.renderEntries(local, true);
    } else {
      this.add
        .text(cx, GAME_HEIGHT / 2, 'NO SCORES YET\nBE THE FIRST!', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#888888',
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  private renderEntries(entries: LeaderboardEntry[], _local: boolean): void {
    const startY = 42;
    const rowH = 14;
    for (let i = 0; i < Math.min(10, entries.length); i++) {
      const e = entries[i];
      const y = startY + i * rowH;
      const color = i === 0 ? '#ffff66' : i === 1 ? '#dddddd' : i === 2 ? '#cc8855' : '#ffffff';
      // Rank.
      this.add
        .text(8, y, `${String(e.rank).padStart(2, ' ')}.`, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color,
        })
        .setOrigin(0, 0);
      // Name.
      this.add
        .text(28, y, e.name.toUpperCase().slice(0, 12), {
          fontFamily: 'monospace',
          fontSize: '9px',
          color,
        })
        .setOrigin(0, 0);
      // Score (right-aligned).
      this.add
        .text(GAME_WIDTH - 8, y, String(e.score), {
          fontFamily: 'monospace',
          fontSize: '9px',
          color,
        })
        .setOrigin(1, 0);
      // Era + loop (small, below the row).
      const tag = e.era ? `${e.era}${e.loop > 0 ? ` L${e.loop + 1}` : ''}` : '';
      if (tag) {
        this.add
          .text(GAME_WIDTH - 8, y + 7, tag, {
            fontFamily: 'monospace',
            fontSize: '6px',
            color: '#888888',
          })
          .setOrigin(1, 0);
      }
    }
  }
}
