# Scrapline

A 16-bit cyberpunk endless runner. You're a mercenary hunting robots for bounty in a ruined neon city while a scrap storm closes in behind you.

**Play:** https://playscrapline.vercel.app

## Features (v0.1)
- Endless procedurally generated rooftops, gaps, stairs and wall-jump chimneys
- Double jump, wall slide and wall jump
- 5 robot types and 3 run bosses (Crusher, Hive Core, Siege Tank) that return tougher every 500m
- Supply drops with temporary upgrades: armor, fire rate, damage, jump jets, scrap magnet, medkits
- 7 weapons, unlocked through mini-boss fights and achievements
- Training room: spend bounty on captured robots and bosses, then practice against them
- Keyboard, mouse and touch controls; pauses automatically when you switch tabs

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or arrows | < > buttons |
| Jump / double jump / wall jump | Space, W or Up | JUMP |
| Fire | J, X or mouse click | FIRE |
| Pause | Esc or P | pause button |

## Development
```bash
npm install
npm run dev      # http://localhost:5173  (art preview: /gallery.html)
npm run build    # outputs dist/
```

Built with [Phaser 3](https://phaser.io) and [Vite](https://vite.dev). All art is drawn in code (`src/art.js`, `src/art_rooms.js`); there are no image files.
