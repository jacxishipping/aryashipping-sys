'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { FileText, PackageCheck, Anchor, Route, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    location: 'USA / Canada',
    title: 'Request a Quote',
    description:
      'Share pickup city, vehicle details, auction info, condition, and destination province so the lane is priced accurately and transparently.',
    checkpoint: 'Pickup city + province',
    icon: FileText,
  },
  {
    number: '02',
    location: 'Origin pickup',
    title: 'Vehicle Pickup',
    description:
      'Our team coordinates pickup from anywhere in the USA or Canada. Vehicle is collected, photographed, inspected, and prepared for export.',
    checkpoint: 'VIN, title, condition',
    icon: PackageCheck,
  },
  {
    number: '03',
    location: 'Export port',
    title: 'Container Loading',
    description:
      'Loading, port handoff, and ocean freight coordination are tracked. Every detail verified before entering the transit corridor.',
    checkpoint: 'Container + BOL',
    icon: Anchor,
  },
  {
    number: '04',
    location: 'Route choice',
    title: 'Mersin or UAE Route',
    description:
      'Shipment is planned through Mersin (Turkey) or UAE based on logistics, timing, lane cost, and vehicle type to optimize the journey.',
    checkpoint: 'Selected corridor',
    icon: Route,
  },
  {
    number: '05',
    location: 'Afghanistan',
    title: 'Customs & Delivery',
    description:
      'Final import support and delivery coordination to Herat, Kabul, Kandahar, Mazar-i-Sharif, and all 34 provinces.',
    checkpoint: 'Customs + final mile',
    icon: CheckCircle2,
  },
];

export default function ServicesProcessSection() {
  const targetRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: targetRef });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-65%']);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.5]);

  return (
    <section ref={targetRef} className="relative h-[300vh] bg-[#F9FAFB]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-[#F9FAFB]">
        {/* Background effects */}
        <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 h-[50vh] w-[50vh] rounded-full bg-[#D4AF37]/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[50vh] w-[50vh] rounded-full bg-[#D4AF37]/5 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
        </motion.div>

        <div className="relative z-10 w-full pl-4 sm:pl-6 lg:pl-16 flex flex-col justify-center h-full">
          {/* Section header */}
          <div className="mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-6 bg-[#D4AF37]" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">The process</span>
            </div>
            <h2 className="mt-6 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-7xl max-w-4xl tracking-tight leading-[1.05]">
              Five milestones.
              <br />
              <span className="text-black/50 italic font-serif font-light">Zero friction.</span>
            </h2>
          </div>

          {/* Horizontal scrolling track */}
          <motion.div style={{ x }} className="flex gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="group relative flex w-[350px] sm:w-[420px] shrink-0 flex-col rounded-[2rem] border border-black/[0.03] bg-white p-10 transition-all hover:border-black/5"
                >
                  <div className="absolute top-10 right-10 text-[6rem] font-bold text-gray-900/5 leading-none transition-colors group-hover:text-black/10">
                    {step.number}
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-black/5 group-hover:border-[#D4AF37]/50 transition-colors shadow-sm">
                    <Icon className="h-7 w-7 text-gray-900 group-hover:text-[#D4AF37] transition-colors" />
                  </div>

                  <div className="mt-20">
                    <span className="inline-block rounded-full bg-[#D4AF37]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#D4AF37] mb-4">
                      {step.location}
                    </span>
                    <h3 className="text-2xl font-extrabold text-gray-900 mb-4">{step.title}</h3>
                    <p className="text-base text-black/60 leading-relaxed font-medium mb-10 min-h-[80px]">
                      {step.description}
                    </p>

                    <div className="mt-auto border-t border-black/5 pt-6">
                      <p className="text-xs uppercase tracking-widest text-black/40 font-mono mb-2">Key checkpoint</p>
                      <p className="text-sm font-bold text-black/80">{step.checkpoint}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* End cap */}
            <div className="flex w-[200px] shrink-0 items-center justify-center text-black/20 px-10 border-l border-dashed border-black/5">
              <span className="text-sm font-mono tracking-widest uppercase rotate-[-90deg] whitespace-nowrap">
                End of process
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
