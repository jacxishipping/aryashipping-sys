const fs = require('fs');
const file = 'src/components/sections/home/HeroSection.tsx';
if (fs.existsSync(file)) {
  let d = fs.readFileSync(file, 'utf8');
  // Specifically fix text inversion bugs in Hero that script missed
  d = d.replace(/bg-gray-900 text-white shadow-\[0_0_15px_rgba\(255,255,255,0\.8\)\]/g, 'bg-gray-900 text-white shadow-xl');
  d = d.replace(/text-gray-900\/50 uppercase tracking-\[0\.3em\]/g, 'text-gray-900/40 uppercase tracking-[0.3em]');
  d = d.replace(/bg-black border/g, 'bg-white border');
  d = d.replace(/bg-gray-900\/5 backdrop-blur-sm border/g, 'bg-white/50 backdrop-blur-sm border');
  d = d.replace(/text-gray-900 font-bold drop-shadow-md/g, 'text-gray-900 font-bold');
  d = d.replace(/text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900\/50/g, 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-500');
  fs.writeFileSync(file, d);
}
