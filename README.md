# Time Pilot — Arcade Edition

Faithful, browser-based homage to Konami's 1982 _Time Pilot_, built with **Phaser 3 + TypeScript + Vite** and deployed to **Vercel**.

## Local development

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Production build

```powershell
npm run build
npm run preview
```

Output is a static site in `dist/` — drop it on any host. For Vercel, just import the GitHub repo; no extra config needed.

## Controls (current)

- **Arrow Left / Right** — rotate jet
- **Space** — fire
- **L** (menu screen) — open the leaderboard
- Mobile touch input arrives in Phase 5.

## Roadmap

See [/memories/session/plan.md](./.copilot/plan.md) (or your saved planning doc).

- [x] Phase 1 — scaffold + deploy pipeline
- [ ] Phase 2 — core gameplay (in progress)
- [ ] Phase 3 — mothership + 5 eras + parachute pilots
- [ ] Phase 4 — pixel-art sprites + Web Audio synth
- [ ] Phase 5 — mobile touch + gamepad
- [ ] Phase 6 — Vercel KV global leaderboard
- [ ] Phase 7 — game-over name/email form + privacy
- [ ] Phase 8 — polish + PWA + launch
