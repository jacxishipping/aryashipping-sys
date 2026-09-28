const fs = require('fs');

const files = [
  'src/components/sections/Header.tsx',
  'src/components/sections/home/HeroSection.tsx',
  'src/components/sections/RoutesAnimatedSection.tsx',
  'src/components/sections/home/ServicesPreviewSection.tsx',
  'src/components/sections/home/ProcessSection.tsx',
  'src/components/sections/PublicRateCalculatorSection.tsx',
  'src/components/sections/home/ProvinceCoverageSection.tsx',
  'src/components/sections/Footer.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let d = fs.readFileSync(f, 'utf8');
  
  // Replace dark backgrounds
  d = d.replace(/bg-black/g, 'bg-[#F9FAFB]');
  d = d.replace(/bg-\[\#0a0a0a\]/g, 'bg-[#F9FAFB]');
  d = d.replace(/bg-\[\#111\]/g, 'bg-white');
  
  // Replace border opacities
  d = d.replace(/border-white\/10/g, 'border-black/5');
  d = d.replace(/border-white\/20/g, 'border-black/10');
  d = d.replace(/border-white\/5/g, 'border-black/[0.03]');
  d = d.replace(/border-white\/40/g, 'border-black/20');
  
  // Replace semi-transparent white backgrounds with black equivalents
  d = d.replace(/bg-white\/5/g, 'bg-black/[0.03]');
  d = d.replace(/bg-white\/10/g, 'bg-black/5');
  d = d.replace(/bg-white\/20/g, 'bg-black/10');
  d = d.replace(/bg-white\/\[0\.02\]/g, 'bg-black/[0.02]');
  d = d.replace(/bg-white\/\[0\.08\]/g, 'bg-black/[0.05]');
  
  // We need to temporarily hide `bg-white` from text replacement if we use it, 
  // but we aren't changing `bg-white` to black globally (buttons should stay their color, or shift to dark?)
  // Actually, in a light theme, we often want elements to be white, and text to be gray-900.
  // Dark theme buttons were bg-white text-black. Now they should be bg-black text-white.
  
  // Text colors
  d = d.replace(/text-white\/10/g, 'text-black/10');
  d = d.replace(/text-white\/20/g, 'text-black/20');
  d = d.replace(/text-white\/30/g, 'text-black/40');
  d = d.replace(/text-white\/40/g, 'text-black/50');
  d = d.replace(/text-white\/50/g, 'text-black/60');
  d = d.replace(/text-white\/60/g, 'text-black/60');
  d = d.replace(/text-white\/70/g, 'text-black/70');
  d = d.replace(/text-white\/80/g, 'text-black/80');
  d = d.replace(/text-white\/90/g, 'text-black/90');
  d = d.replace(/text-white/g, 'text-gray-900');
  
  // Invert the main buttons that were bg-white text-black -> bg-black text-white
  d = d.replace(/bg-white text-gray-900/g, 'bg-gray-900 text-white');
  d = d.replace(/bg-white text-black/g, 'bg-gray-900 text-white');

  // Fix Hero Overlays
  if (f.includes('HeroSection.tsx')) {
    d = d.replace(/from-black\/60 via-black\/20 to-black\/80/g, 'from-white/60 via-white/20 to-white/90');
    d = d.replace(/transparent_0%,black_100%/g, 'transparent_0%,white_100%');
    d = d.replace(/text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900\/50/g, 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-500');
    d = d.replace(/bg-black\/60/g, 'bg-white/80'); // the overlay stat box
  }
  
  // Fix Header
  if (f.includes('Header.tsx')) {
    d = d.replace(/bg-\[\#F9FAFB\]\/40/, 'bg-white/80');
    d = d.replace(/bg-\[\#F9FAFB\] text-gray-900/g, 'bg-white text-gray-900'); // the mobile menu overlay
    d = d.replace(/border-gray-900\/20/g, 'border-black/10');
    
    // Reverse hover logic for header links
    d = d.replace(/group-hover:text-black/g, 'group-hover:text-white');
  }

  // Fix Routes
  if (f.includes('RoutesAnimatedSection.tsx')) {
     d = d.replace(/bg-\[\#F9FAFB\]\/60/g, 'bg-white/80');
  }

  // Fix Process
  if (f.includes('ProcessSection.tsx')) {
    d = d.replace(/bg-\[\#F9FAFB\] p-10/g, 'bg-white p-10');
    d = d.replace(/border-gray-900\/5/g, 'border-black/5');
  }

  fs.writeFileSync(f, d);
});
