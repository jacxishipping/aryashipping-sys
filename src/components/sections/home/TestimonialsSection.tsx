'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: 'JACXI handled my Toyota Land Cruiser with absolute professionalism. It arrived in Herat in perfect condition, and the customs process was incredibly clear from start to finish.',
    name: 'Ahmed R.',
    role: 'Herat, Afghanistan',
  },
  {
    quote: 'I was nervous about shipping my car internationally, but the JACXI team kept me updated at every stage. Reliable, responsive, and completely transparent operations.',
    name: 'Khalid M.',
    role: 'Kabul, Afghanistan',
  },
  {
    quote: 'Best price I found for USA to Afghanistan shipping. The team is honest, direct, and careful with the details. The tracking portal gave me total peace of mind.',
    name: 'Farida N.',
    role: 'Kandahar, Afghanistan',
  },
  {
    quote: 'They handled our fleet shipment with strong coordination from pickup through final destination. The route visibility made a real difference for our operational planning.',
    name: 'Sarah Jenkins',
    role: 'Fleet client',
  },
];

export default function TestimonialsSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const x1 = useTransform(scrollYProgress, [0, 1], [0, -400]);
  const x2 = useTransform(scrollYProgress, [0, 1], [-400, 0]);

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-[#F9FAFB] py-32 sm:py-48 text-black">
      
      {/* Absolute Background Typography */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-5">
        <h2 className="text-[20vw] font-black tracking-tighter leading-none whitespace-nowrap">
          TRUSTED
        </h2>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-24 text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 justify-center mb-6">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Verified clients</span>
            <span className="h-px w-6 bg-[#D4AF37]" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl max-w-3xl mx-auto">
            Reputation built on <br/>
            <span className="italic font-serif font-light text-black/40">flawless delivery.</span>
          </h2>
        </motion.div>
      </div>

      {/* Marquee Row 1 */}
      <div className="relative flex whitespace-nowrap mb-8 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div style={{ x: x1 }} className="flex gap-8 px-4">
          {[...testimonials, ...testimonials].slice(0, 4).map((item, idx) => (
             <TestimonialCard key={`row1-${idx}`} item={item} />
          ))}
        </motion.div>
      </div>

      {/* Marquee Row 2 */}
      <div className="relative flex whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div style={{ x: x2 }} className="flex gap-8 px-4">
          {[...testimonials, ...testimonials].slice(4, 8).map((item, idx) => (
             <TestimonialCard key={`row2-${idx}`} item={item} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({ item }: { item: any }) {
  return (
    <div className="group relative w-[450px] sm:w-[500px] shrink-0 rounded-[2rem] border border-black/5 bg-white p-10 shadow-xl transition-all hover:bg-black hover:text-white cursor-grab active:cursor-grabbing">
      <div className="absolute top-10 right-10 text-[#D4AF37] opacity-20 group-hover:opacity-100 transition-opacity">
        <Quote className="h-12 w-12" />
      </div>
      
      <p className="text-lg sm:text-xl font-medium leading-relaxed whitespace-normal min-h-[120px] pr-8">
        "{item.quote}"
      </p>
      
      <div className="mt-10 flex items-center gap-5 border-t border-black/10 group-hover:border-white/10 pt-6 transition-colors">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37] text-white font-bold text-xl shadow-lg">
          {item.name.charAt(0)}
        </div>
        <div>
          <p className="font-extrabold tracking-tight text-lg">{item.name}</p>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 font-mono mt-1">{item.role}</p>
        </div>
      </div>
    </div>
  );
}
