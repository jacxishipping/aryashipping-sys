'use client';

import { motion } from 'framer-motion';

const provinces = [
  'Herat', 'Kabul', 'Kandahar', 'Mazar-i-Sharif', 'Jalalabad', 'Kunduz', 'Ghazni', 'Balkh', 'Nimruz', 'Khost'
];

export default function ProvinceCoverageSection() {
  return (
    <section className="bg-[#F9FAFB] py-24 sm:py-32 overflow-hidden border-t border-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-16">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
         >
           <h2 className="text-3xl font-extrabold text-[#D4AF37] tracking-tight uppercase font-mono">
             Serving all major hubs
           </h2>
         </motion.div>
      </div>

      <div className="relative flex whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] overflow-hidden py-10">
        <motion.div 
          className="flex items-center gap-16 px-8"
          animate={{ x: [0, -2000] }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
        >
          {[...provinces, ...provinces, ...provinces].map((prov, i) => (
             <div key={i} className="flex items-center gap-16">
               <span className="text-5xl md:text-7xl font-black text-black/10 italic hover:text-black/50 transition-colors uppercase tracking-widest">{prov}</span>
               <span className="text-3xl text-[#D4AF37] font-serif">+</span>
             </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}