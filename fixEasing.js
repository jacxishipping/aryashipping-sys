const fs = require('fs');
const file = 'src/components/sections/home/HeroSection.tsx';
if (fs.existsSync(file)) {
  let d = fs.readFileSync(file, 'utf8');
  d = d.replace(/transition: \{ duration: 0\.58, ease: \[0\.22, 1, 0\.36, 1\] \}/g, 'transition: { duration: 0.58, ease: "easeOut" }');
  d = d.replace(/transition: \{ duration: 0\.8, ease: \[0\.2, 0\.65, 0\.3, 0\.9\] \}/g, 'transition: { duration: 0.8, ease: "easeOut" }');
  d = d.replace(/transition: \{\s*duration: 1\.2, delay: 0\.6, ease: \[0\.22, 1, 0\.36, 1\]\s*\}/g, 'transition: { duration: 1.2, delay: 0.6, ease: "easeOut" }');
  fs.writeFileSync(file, d);
}
