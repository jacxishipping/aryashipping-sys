import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outPath = join(root, 'tsc-output.log');

try {
  const output = execSync('node node_modules/typescript/lib/tsc.js --noEmit', {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
    env: process.env,
  });
  writeFileSync(outPath, output || 'TSC_OK\n', 'utf8');
} catch (error) {
  const stdout = error.stdout?.toString?.() ?? '';
  const stderr = error.stderr?.toString?.() ?? '';
  writeFileSync(
    outPath,
    `${stdout}\n${stderr}\nEXIT_CODE:${error.status ?? 1}\n`,
    'utf8',
  );
}