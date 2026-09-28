import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const commands = [
  ['git', 'status', '--short'],
  ['git', 'diff', '--name-only'],
  ['git', 'log', '-1', '--format=%H %s'],
];

let output = '';
for (const parts of commands) {
  output += `\n=== ${parts.join(' ')} ===\n`;
  try {
    output += execSync(parts.join(' '), { encoding: 'utf8', cwd: process.cwd() });
  } catch (error) {
    output += `${error.stdout || ''}${error.stderr || ''}\nEXIT:${error.status}\n`;
  }
}

writeFileSync('git-status.log', output, 'utf8');