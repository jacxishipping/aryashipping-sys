import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

const output = `${result.stdout || ''}${result.stderr || ''}`.trim() || `exit:${result.status}`;
writeFileSync(join(root, 'typecheck-result.txt'), output);
process.exit(result.status ?? 1);