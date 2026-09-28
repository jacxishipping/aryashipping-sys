import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';

const logPath = join(process.cwd(), 'build-output.log');
const log = createWriteStream(logPath, { flags: 'w' });

const child = spawn('npm', ['run', 'build'], {
  cwd: process.cwd(),
  shell: true,
  env: process.env,
});

child.stdout.on('data', (chunk) => log.write(chunk));
child.stderr.on('data', (chunk) => log.write(chunk));

child.on('close', (code) => {
  log.write(`\nEXIT_CODE:${code}\n`);
  log.end();
});