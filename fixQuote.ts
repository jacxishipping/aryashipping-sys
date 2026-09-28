import fs from 'fs';
const file = 'src/components/sections/QuoteFormSection.tsx';
let data = fs.readFileSync(file, 'utf-8');

data = data.replace(
  /const fieldClassName = 'w-full rounded-xl border border-\[rgba\(var\\\(--border-rgb\),0\.6\)\] bg-white\/70 px-4 py-3\.5 text-base text-\[var\\\(--text-primary\)\] shadow-inner outline-none transition-all duration-300 focus:border-\[var\\\(--accent-gold\)\] focus:ring-4 focus:ring-\[rgba\(var\\\(--accent-gold-rgb\),0\.1\)\] focus:bg-white placeholder:text-gray-400';/g,
  "const fieldClassName = 'peer w-full rounded-none border-0 border-b border-black/20 bg-transparent px-0 py-4 text-xl text-black shadow-none outline-none transition-all duration-300 focus:border-[#D4AF37] focus:ring-0 placeholder:text-transparent';"
);

data = data.replace(
  /const labelClassName = 'mb-2\.5 block text-xs font-bold uppercase tracking-wide text-\[var\\\(--text-secondary\)\]';/g,
  "const labelClassName = 'pointer-events-none absolute left-0 top-4 text-lg text-black/50 transition-all duration-300 peer-focus:-translate-y-8 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-[#D4AF37] peer-[:not(:placeholder-shown)]:-translate-y-8 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:text-black/50';"
);

data = data.replace(
  /className=\{labelClassName\}/g,
  "className={labelClassName}"
);

fs.writeFileSync(file, data);
