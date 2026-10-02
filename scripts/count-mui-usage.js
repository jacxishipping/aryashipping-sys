const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'mui-inventory.json'), 'utf8'));
const counts = {};

Object.entries(inventory).forEach(([file, data]) => {
  data.mat.forEach(imp => {
    const match = imp.match(/import\s*\{([^}]+)\}/);
    if (match) {
      match[1].split(',').forEach(item => {
        const name = item.trim().split(/\s+as\s+/)[0].trim();
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    }
  });
});

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log('Most imported @mui/material components:');
sorted.forEach(([name, count]) => {
  console.log(`  ${name.padEnd(25)}: ${count}`);
});
