'use client';

import { motion, useScroll, useTransform, useSpring, type Variants } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CirclePlay, Globe, ShieldCheck, Ship } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: 'easeOut' },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 30, rotateX: -40, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: 'easeOut' },
  },
};

const featureChips = [
  { icon: Ship, label: 'Ocean freight', detail: 'Container & RORO' },
  { icon: Globe, label: 'Two routes', detail: 'Mersin or UAE' },
  { icon: ShieldCheck, label: 'Full customs', detail: 'End-to-end clearance' },
];

export default function ServicesHeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });

  const smoothYProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const contentY = useTransform(smoothYProgress, [0, 1], ['0%', '40%']);
  const contentOpacity = useTransform(smoothYProgress, [0, 0.6], [1, 0]);
  const wordsBlur = useTransform(smoothYProgress, [0, 0.5], ['blur(0px)', 'blur(10px)']);
  const card1Y = useTransform(smoothYProgress, [0, 1], [0, -150]);
  const gridOpacity = useTransform(smoothYProgress, [0, 1], [0.12, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate box-border min-h-[100svh] overflow-hidden bg-[#F9FAFB] px-4 pb-12 pt-28 text-gray-900 sm:px-6 lg:px-8 flex flex-col justify-center"
    >
      {/* Grid texture */}
      <motion.div
        style={{
          opacity: gridOpacity,
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
        }}
        className="absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[length:40px_40px]"
      />

      {/* Gold ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[60vh] w-[60vh] rounded-full bg-[#D4AF37]/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[40vh] w-[40vh] rounded-full bg-[#D4AF37]/5 blur-[100px]" />

      {/* Noise overlay for premium feel */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity, filter: wordsBlur }}
        className="mx-auto grid h-full w-full max-w-7xl gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center relative z-10"
      >
        {/* Left content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-center pt-8 sm:pt-24 lg:pt-0"
        >
          {/* Section label */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 self-start">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Our services</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 className="mt-10 max-w-4xl text-[3.25rem] font-extrabold leading-[0.95] tracking-tighter text-gray-900 sm:text-[4.5rem] lg:text-[5.5rem]">
            {['Complete', 'logistics.'].map((word, i) => (
              <motion.span key={i} className="inline-block mr-3 lg:mr-4 origin-bottom-left" variants={wordVariants}>
                {word}
              </motion.span>
            ))}
            <br className="hidden sm:block" />
            <span className="relative inline-block mt-2">
              <motion.span
                className="relative z-10 italic font-serif font-light text-black/40 flex gap-3 lg:gap-4"
                variants={wordVariants}
              >
                One trusted team.
              </motion.span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-8 max-w-xl text-lg leading-relaxed text-black/60 sm:text-xl font-medium"
          >
            Every capability needed to move your vehicle from{' '}
            <span className="text-gray-900 font-semibold">USA and Canada</span> to{' '}
            <span className="text-gray-900 font-semibold">Afghanistan</span> — through{' '}
            <span className="text-[#D4AF37] underline decoration-[#D4AF37]/20 underline-offset-4 decoration-2">
              Mersin
            </span>{' '}
            or{' '}
            <span className="text-[#D4AF37] underline decoration-[#D4AF37]/20 underline-offset-4 decoration-2">UAE</span>{' '}
            — handled under one roof.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Magnetic>
              <Link
                href="/#quote"
                className="group relative inline-flex h-16 min-w-[200px] items-center justify-center gap-3 overflow-hidden rounded-full bg-gray-900 px-8 text-base font-bold text-white shadow-xl transition-all duration-500 hover:shadow-2xl"
              >
                <div className="absolute inset-0 h-full w-full bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                <span className="relative z-10 group-hover:text-black transition-colors duration-500">
                  Get a free quote
                </span>
                <ArrowRight className="relative z-10 h-5 w-5 -rotate-45 transition-transform duration-500 group-hover:rotate-0 group-hover:text-black group-hover:translate-x-1" />
              </Link>
            </Magnetic>

            <Magnetic>
              <Link
                href="/tracking"
                className="group relative inline-flex h-16 items-center justify-center gap-3 rounded-full border border-black/10 bg-transparent px-8 text-base font-semibold text-gray-900 transition-all duration-500 hover:bg-black/5 hover:border-black/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-gray-900 group-hover:bg-black group-hover:text-white transition-colors duration-500">
                  <CirclePlay className="h-4 w-4 fill-current" />
                </div>
                Track a shipment
              </Link>
            </Magnetic>
          </motion.div>

          {/* Feature chips */}
          <motion.div
            variants={itemVariants}
            className="mt-14 hidden md:flex items-center gap-6 pt-8 border-t border-black/5"
          >
            {featureChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <div key={chip.label} className="flex items-start gap-4 flex-1 group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/5 group-hover:border-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all duration-300">
                    <Icon className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-black/90">{chip.label}</h3>
                    <p className="mt-1 text-xs text-black/60 leading-snug">{chip.detail}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Right: floating info cards */}
        <motion.div
          style={{ y: card1Y }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-center items-end h-full pb-32 gap-8 relative"
        >
          {/* Card 1 */}
          <motion.div
            className="transform"
            whileHover={{ scale: 1.05, rotateX: 10, rotateY: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-2xl w-80 relative overflow-hidden group">
              <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-xl">
                  <Ship className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-black/50 uppercase tracking-[0.2em] mb-1.5 font-mono">
                    Status
                  </p>
                  <div className="flex items-center gap-2.5 text-[0.95rem] tracking-tight text-gray-900 font-bold">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-green-400 relative">
                      <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-70" />
                    </span>
                    6 services active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            className="mr-16 transform"
            whileHover={{ scale: 1.05, rotateX: -10, rotateY: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-2xl w-72 relative overflow-hidden group">
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 group-hover:ring-[#D4AF37]/30 transition-all duration-500" />
              <div className="flex flex-col relative z-10">
                <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-4">
                  <span className="text-4xl font-black text-gray-900 leading-none tracking-tighter">100%</span>
                  <div className="h-12 w-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="text-[11px] text-black/60 font-bold uppercase tracking-[0.1em]">
                  Coverage to all 34 provinces
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
