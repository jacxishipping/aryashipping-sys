import { execSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';

const logPath = 'build-capture.log';
writeFileSync(logPath, `START ${new Date().toISOString()}\n`, 'utf8');

try {
  const output = execSync('npm run build', {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    shell: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  appendFileSync(logPath, output, 'utf8');
  appendFileSync(logPath, '\nBUILD_OK\n', 'utf8');
} catch (error) {
  appendFileSync(logPath, error.stdout?.toString?.() ?? '', 'utf8');
  appendFileSync(logPath, error.stderr?.toString?.() ?? '', 'utf8');
  appendFileSync(logPath, `\nBUILD_FAIL:${error.status ?? 1}\n`, 'utf8');
}