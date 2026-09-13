# js/game/

Copies from [Niklaser74/snailmageddon](https://github.com/Niklaser74/snailmageddon)
(`js/`): the renderer that draws the snails, the shell and hat
patterns, and the sound effects — without a build step or a runtime
dependency on the game's deployment.

- Source commit: `2c7c8ac4d9dea74b58ac37f82fcf8cac93718758` (synced 2026-09-13)
- Files: snails.js, cosmetics.js, audio.js
- Import graph: snails.js → cosmetics.js; audio.js stands alone. Nothing here touches the network.

**Do not edit these files.** Change them in the game repo and run
`npm run sync:game` (env `GAME_DIR` points at the checkout, default
`../dev-snailmageddon`).
