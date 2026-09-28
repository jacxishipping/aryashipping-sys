const fs = require('fs');
const path = require('path');

const targets = [
  ['node_modules', '@tanstack', 'react-query', 'build', 'modern', 'index.d.cts'],
  ['node_modules', '@tanstack', 'react-query', 'build', 'legacy', 'index.d.cts'],
];

for (const sourceParts of targets) {
  const sourcePath = path.join(__dirname, '..', ...sourceParts);
  const targetPath = sourcePath.replace(/\.d\.cts$/, '.d.ts');

  if (!fs.existsSync(sourcePath) || fs.existsSync(targetPath)) {
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
}