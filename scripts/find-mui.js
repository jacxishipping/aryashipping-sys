const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = walk(path.join(__dirname, '..', 'src'));
const muiFiles = [];

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('@mui')) {
    muiFiles.push(path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/'));
  }
});

console.log(`Total files containing @mui: ${muiFiles.length}`);
muiFiles.forEach(f => console.log(f));
