#!/usr/bin/env node
// Refreshes js/game/ from the Snäckmageddon repo: the renderers that draw the
// snails, the garden palette, the sound effects and the deterministic RNG.
//   GAME_DIR=../dev-snailmageddon node scripts/sync-game.mjs
//
// Only what the board actually uses is vendored: the snail renderer, the shell
// and hat patterns it draws with, and the sound effects. The duel simulation,
// the terrain mask, the garden themes and the deterministic RNG belong to games
// with a world in them — a sheet of squared paper has none, and leaving them out
// keeps sw.js and the offline cache honest about what ships.
import { copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = resolve(root, process.env.GAME_DIR || '../dev-snailmageddon');
const FILES = ['snails.js', 'cosmetics.js', 'audio.js'];

if (!existsSync(join(game, 'js', 'snails.js'))) {
  console.error(`No game checkout at ${game} (set GAME_DIR).`);
  process.exit(1);
}
for (const f of FILES) copyFileSync(join(game, 'js', f), join(root, 'js', 'game', f));
const hash = execSync('git rev-parse HEAD', { cwd: game }).toString().trim();
const date = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'js', 'game', 'README.md'), `# js/game/

Copies from [Niklaser74/snailmageddon](https://github.com/Niklaser74/snailmageddon)
(\`js/\`): the renderer that draws the snails, the shell and hat
patterns, and the sound effects — without a build step or a runtime
dependency on the game's deployment.

- Source commit: \`${hash}\` (synced ${date})
- Files: ${FILES.join(', ')}
- Import graph: snails.js → cosmetics.js; audio.js stands alone. Nothing here touches the network.

**Do not edit these files.** Change them in the game repo and run
\`npm run sync:game\` (env \`GAME_DIR\` points at the checkout, default
\`../dev-snailmageddon\`).
`);
console.log(`synced ${FILES.length} files from ${game} @ ${hash.slice(0, 7)}`);
