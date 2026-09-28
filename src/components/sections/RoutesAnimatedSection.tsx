'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2, Clock, Container, MapPin, Ship, Truck } from 'lucide-react';

const journeySteps = [
  { step: '01', icon: Truck, location: 'USA / Canada', title: 'Pickup & Export Prep', description: 'Vehicle intake, inspection, auction or home pickup, title checks, and port loading.', duration: '1-5 days' },
  { step: '02', icon: Ship, location: 'Route option A', title: 'Mersin, Turkey Route', description: 'Moves through Mersin with Turkey port handoff visibility for streamlined logistics.', duration: 'Timing varies' },
  { step: '03', icon: Container, location: 'Route option B', title: 'UAE Route', description: 'Alternate route through UAE with precise transit control and onward shipment planning.', duration: 'Timing varies' },
  { step: '04', icon: CheckCircle2, location: 'Afghanistan', title: 'Customs & Delivery', description: 'Final customs support and delivery to Herat, Kabul, Kandahar, Mazar, and beyond.', duration: '2-6 days' },
];

const nodes = [
  { id: 'canada', x: 250, y: 168, label: 'Canada' },
  { id: 'usa', x: 230, y: 222, label: 'USA' },
  { id: 'mersin', x: 555, y: 230, label: 'Mersin' },
  { id: 'uae', x: 604, y: 306, label: 'UAE' },
  { id: 'afghanistan', x: 632, y: 250, label: 'Afghanistan' },
];

const paths = [
  { path: 'M 250 168 Q 390 92 555 230 Q 600 220 632 250' },
  { path: 'M 230 222 Q 398 150 555 230 Q 600 220 632 250' },
  { path: 'M 250 168 Q 430 178 604 306 Q 632 290 632 250' },
  { path: 'M 230 222 Q 430 230 604 306 Q 632 290 632 250' },
];

export default function RoutesAnimatedSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 70%", "end 50%"]
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={containerRef} id="route" className="relative overflow-hidden bg-[#F9FAFB] py-24 sm:py-32 selection:bg-[var(--accent-gold)] selection:text-gray-900 scroll-mt-20">
      <div id="routes" className="absolute -top-20" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-gold-rgb),0.1)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center rounded-full border border-black/5 bg-[#F9FAFB]/[0.03] px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#D4AF37] backdrop-blur-md">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              Global routing
            </div>
            
            <h2 className="mt-8 text-4xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl lg:text-[4rem]">
              Precision paths to <br/>
              <span className="text-black/50 italic font-serif font-light">Afghanistan.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-black/60">
              Your vehicle moves from <span className="text-gray-900">North America</span> to <span className="text-gray-900">Afghanistan</span> through carefully optimized corridors: the <span className="text-[#D4AF37]">Mersin Route</span> or the <span className="text-[#D4AF37]">UAE Route</span>. Clear visibility at every nautical mile.
            </p>

            <div className="mt-12 flex flex-col gap-6 relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-[#D4AF37]/50 via-white/10 to-transparent" />
              {[
                { label: 'Origin', value: 'USA & Canada' },
                { label: 'Hubs', value: 'Turkey or UAE' },
                { label: 'Final', value: 'Afghan Provinces' },
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1), duration: 0.5 }}
                  key={item.label} 
                  className="flex items-center gap-6"
                >
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F9FAFB] border border-black/10 shadow-[0_0_15px_rgba(212,175,55,0.2)] text-[#D4AF37]">
                    <div className="h-2 w-2 rounded-full bg-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-black/50 font-mono">{item.label}</p>
                    <p className="text-base font-medium text-gray-900">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative w-full rounded-[2.5rem] border border-black/5 bg-[#F9FAFB]/[0.02] p-2 backdrop-blur-xl shadow-2xl"
          >
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-[#F9FAFB]">
              <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover bg-center bg-no-repeat opacity-20 sepia hue-rotate-180 brightness-50" />
              
              <svg viewBox="0 0 950 620" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.1" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {paths.map((p, i) => (
                  <path key={`base-${i}`} d={p.path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="4 8" />
                ))}

                {paths.map((p, i) => (
                  <motion.path
                    key={`active-${i}`}
                    d={p.path}
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    style={{ pathLength }}
                  />
                ))}

                {nodes.map((node, i) => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r="6" fill="#D4AF37" className="animate-pulse" />
                    <circle cx={node.x} cy={node.y} r="14" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
                    <text x={node.x} y={node.y - 20} fill="#ffffff" fontSize="14" fontWeight="600" textAnchor="middle" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>

              <motion.div 
                style={{ y: useTransform(scrollYProgress, [0, 1], [50, -20]) }}
                className="absolute bottom-6 left-6 rounded-2xl border border-black/5 bg-white/80 p-5 backdrop-blur-xl shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-[#D4AF37]/20 p-2 text-[#D4AF37]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-black/60">Avg Transit Time</p>
                    <p className="text-xl font-bold text-gray-900">30-45 Days</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 perspective-1000">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, rotateX: 45, y: 40 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-black/5 bg-[#F9FAFB]/[0.03] p-6 backdrop-blur-sm transition-all hover:bg-[#F9FAFB]/[0.05]"
              >
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-transparent shadow-inner border border-black/[0.03] group-hover:border-[#D4AF37]/50 transition-colors">
                    <Icon className="h-5 w-5 text-gray-900 group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                  <span className="text-4xl font-black text-gray-900/5 group-hover:text-black/10 transition-colors">{step.step}</span>
                </div>
                
                <div>
                  <p className="mb-2 inline-block rounded-full bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                    {step.location}
                  </p>
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-black/60">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}