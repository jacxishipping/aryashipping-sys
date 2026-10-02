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
const categorized = {};

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.includes('@mui')) return;

  const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
  
  // extract imports from @mui/material and @mui/icons-material
  const muiMatMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@mui\/material['"]/g) || [];
  const muiIconsMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@mui\/icons-material['"]/g) || [];
  const defaultIconsMatch = content.match(/import\s+(\w+)\s+from\s+['"]@mui\/icons-material\/([^'"]+)['"]/g) || [];

  categorized[rel] = {
    mat: muiMatMatch.map(m => m.replace(/\s+/g, ' ')),
    icons: [
      ...muiIconsMatch.map(m => m.replace(/\s+/g, ' ')),
      ...defaultIconsMatch.map(m => m.replace(/\s+/g, ' '))
    ]
  };
});

fs.writeFileSync(path.join(__dirname, 'mui-inventory.json'), JSON.stringify(categorized, null, 2));
console.log(`Saved inventory for ${Object.keys(categorized).length} files.`);
