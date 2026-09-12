import { existsSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(join(projectRoot, 'web', 'dist'));

if (dirname(dirname(distDir)) !== projectRoot || !distDir.endsWith(`${sep}web${sep}dist`)) {
  throw new Error(`Refusing to remove unsafe build path: ${distDir}`);
}

const removeTree = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      removeTree(entryPath);
      rmdirSync(entryPath);
    } else {
      unlinkSync(entryPath);
    }
  }
};

if (existsSync(distDir)) {
  removeTree(distDir);
  rmdirSync(distDir);
}
