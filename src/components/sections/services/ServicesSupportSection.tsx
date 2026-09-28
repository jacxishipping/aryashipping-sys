'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';

const pillars = [
  {
    number: '01',
    title: 'Route Planning',
    text: 'We recommend the right movement plan based on urgency, destination, customs profile, and vehicle type — Mersin or UAE.',
  },
  {
    number: '02',
    title: 'Documentation Control',
    text: 'We keep paperwork aligned from pickup through release so your shipment does not stall during handoffs or at customs.',
  },
  {
    number: '03',
    title: 'Status Visibility',
    text: 'Customers know when the vehicle is collected, shipped through the selected route, and assigned for Afghanistan delivery.',
  },
];

export default function ServicesSupportSection() {
  return (
    <section className="relative overflow-hidden bg-[#0f172a] py-32 text-white selection:bg-[#D4AF37] selection:text-black">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[50vh] w-[80vw] rounded-full bg-[#D4AF37]/5 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[30vh] w-[30vw] rounded-full bg-[#D4AF37]/5 blur-[80px]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center mb-20"
        >
          <div className="inline-flex items-center gap-3 justify-center mb-6">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Additional support</span>
            <span className="h-px w-6 bg-[#D4AF37]" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Built around the route,{' '}
            <br />
            <span className="italic font-serif font-light text-white/40">not generic shipping.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-400 max-w-2xl mx-auto">
            Our service model covers export preparation in the USA and Canada, route coordination through either Mersin
            or UAE, and structured inland delivery planning for Afghanistan.
          </p>
        </motion.div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <motion.article
              key={pillar.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative rounded-[2rem] border border-slate-700/50 bg-slate-900/60 p-8 transition-all hover:border-[#D4AF37]/30 hover:bg-slate-900"
            >
              <div className="absolute top-8 right-8 text-6xl font-black text-white/5 leading-none group-hover:text-white/10 transition-colors">
                {pillar.number}
              </div>
              <div className="mb-4 h-px w-10 bg-[#D4AF37]" />
              <h3 className="text-2xl font-extrabold text-white mb-4">{pillar.title}</h3>
              <p className="leading-relaxed text-slate-400">{pillar.text}</p>
            </motion.article>
          ))}
        </div>

        {/* CTA block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 flex flex-col items-center gap-6 text-center"
        >
          <p className="text-lg text-slate-400 max-w-lg">
            Ready to move your vehicle? Talk to the team and get a transparent, accurate quote within 24 hours.
          </p>
          <Magnetic>
            <Link
              href="/#quote"
              className="group relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-full bg-white px-10 text-base font-bold text-black shadow-xl transition-all"
            >
              <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
              <span className="relative z-10 group-hover:text-black transition-colors duration-500">
                Request a free quote
              </span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
