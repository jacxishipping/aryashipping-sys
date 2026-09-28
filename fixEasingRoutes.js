const fs = require('fs');
const files = [
  'src/components/sections/RoutesAnimatedSection.tsx',
  'src/components/sections/Header.tsx',
  'src/components/sections/Footer.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let d = fs.readFileSync(f, 'utf8');
    d = d.replace(/ease:\s*\[[\d\.\s,]+\]/g, 'ease: "easeOut"');
    fs.writeFileSync(f, d);
  }
});
