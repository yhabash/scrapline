# Scrapline

A 16-bit cyberpunk endless runner. You're a mercenary hunting robots for bounty in a ruined neon city while a scrap storm closes in behind you.

**Play:** https://playscrapline.vercel.app

## Features (v0.3)
- 10 seeded rooftop maps with their own colours and layouts; each run picks one at random
- Endless procedurally generated rooftops, gaps, stairs and wall-jump chimneys
- Double jump, wall slide and wall jump
- 5 robot types and 3 run bosses (Crusher, Hive Core, Siege Tank) that return tougher every 500m
- Supply drops with temporary upgrades: armor, fire rate, damage, jump jets, scrap magnet, medkits
- 7 weapons, including the Ricochet Disc, unlocked through mini-boss fights and achievements
- 3 arena mini-bosses that enrage at half health
- Training room: spend bounty on captured robots and bosses, then practice against them
- Keyboard, mouse and full-screen phone controls (slide-to-run thumb zone, JUMP and FIRE buttons); pauses automatically when you switch tabs
- Synthesized 16-bit sound effects and an upbeat funk soundtrack (menu, run and boss tracks), with volume settings
- Global leaderboards (all-time and weekly) with a name filter, stored in Vercel Blob

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or arrows | Slide a thumb on the left side |
| Jump / double jump / wall jump | Space, W or Up | JUMP |
| Fire | J, X or mouse click | FIRE |
| Pause | Esc or P | Pause button |
| Mute | M | Settings or pause menu |

## Development
```bash
npm install
npm run dev      # http://localhost:5173  (art preview: /gallery.html, sound preview: /sound-preview.html)
npm run build    # outputs dist/
```

Built with [Phaser 3](https://phaser.io) and [Vite](https://vite.dev). All art is drawn in code (`src/art.js`, `src/art_rooms.js`) and all sound is synthesized with the Web Audio API (`src/audio.js`); there are no image or audio files.

The leaderboard API lives in `api/leaderboard.js` (a Vercel Function). It needs a Vercel Blob store connected to the project (`BLOB_READ_WRITE_TOKEN`); in local dev it falls back to an in-memory board.

## Changelog
- **0.3.0**: Funk soundtrack, 10 random maps, Ricochet Disc replaces the Plasma Blade, tougher mini-bosses, full-screen phone controls, Demolisher achievement unlocks the Grenade Launcher, Pulse SMG +25% damage, separate staging leaderboard.
- **0.2.0**: Sound effects, synthwave music, settings screen, global all-time and weekly leaderboards.
- **0.1.0**: First playable release.
