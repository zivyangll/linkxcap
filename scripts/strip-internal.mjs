// Production builds publish public pages only. The content editor, its JSON
// export and its own bundles stay in preview builds, where the team edits copy.
import fs from 'node:fs/promises';
import path from 'node:path';
if (process.env.PUBLIC_CONTENT_MODE === 'production') {
  const editor = /^a4f9c2e71b6d4830c5a8e2f94d7b136c\./;
  const removed = [];
  for (const dir of ['dist', 'dist/_astro'])
    for (const file of await fs.readdir(dir))
      if (editor.test(file)) {
        await fs.rm(path.join(dir, file));
        removed.push(path.join(dir, file));
      }
  console.log(`Production: removed ${removed.length} content-editor files.`);
}
