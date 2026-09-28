'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Bell, ChevronRight, MapPin, Receipt, ShieldCheck, Smartphone } from 'lucide-react';
import Link from 'next/link';
import Magnetic from '@/components/ui/Magnetic';

const features = [
  { icon: <MapPin className="h-5 w-5" />, title: 'Live tracking', description: 'Follow active shipments as they move through pickup, port, transit, customs, and final delivery.' },
  { icon: <Receipt className="h-5 w-5" />, title: 'Invoices & receipts', description: 'Review balances, documents, and payment details from the customer portal.' },
  { icon: <Bell className="h-5 w-5" />, title: 'Milestone alerts', description: 'Receive status updates when important shipment or document events are posted.' },
];

export default function MobileAppPromoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const yPhone = useTransform(springScroll, [0, 1], [150, -150]);
  const rotatePhone = useTransform(springScroll, [0.2, 0.8], [5, -5]);
  const yWidget = useTransform(springScroll, [0, 1], [-80, 80]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-32 text-black">
      <div className="absolute inset-0 bg-[#f8f8f8] opacity-50" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        
        {/* Left Content */}
        <div className="max-w-2xl relative z-10 pl-4 lg:pl-10">
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="mb-8 h-1 w-24 bg-[#D4AF37] origin-left"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37] font-mono">Customer portal</p>
            <h2 className="mt-6 text-5xl font-black leading-[1.1] tracking-tighter text-black sm:text-6xl md:text-7xl">
              Shipment visibility <br/> from the browser in your pocket.
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-black/60 sm:text-xl font-medium max-w-lg">
              Access shipment updates, invoices, receipts, and documents seamlessly without ever installing a separate app.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6">
            {features.map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + (i * 0.1) }}
                className="group flex gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] cursor-default"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black text-[#D4AF37] shadow-inner group-hover:bg-[#D4AF37] group-hover:text-black transition-colors duration-300">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-extrabold text-black text-lg">{feature.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-black/60">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-12"
          >
            <Magnetic strength={0.2} intensity={0.15}>
              <Link
                href="/auth/signin"
                className="group relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-full bg-black px-10 text-base font-bold text-white shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                <span className="relative z-10 group-hover:text-black transition-colors duration-500">Access portal</span>
                <ChevronRight className="relative z-10 h-5 w-5 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-black" />
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        {/* Right Content - The Phone Parallax */}
        <div className="relative mx-auto w-full max-w-[420px] h-[800px] flex items-center justify-center hidden lg:flex perspective-1000">
          
          {/* Floating Floating Widget */}
          <motion.div
            style={{ y: yWidget }}
            className="absolute -left-16 top-1/4 z-30 flex items-center gap-4 rounded-2xl border border-white/40 bg-white/80 p-5 text-black shadow-2xl backdrop-blur-3xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black">Cleared customs</p>
              <p className="text-xs font-semibold text-black/40">Transit milestone</p>
            </div>
          </motion.div>

          {/* The Phone Container */}
          <motion.div
            style={{ y: yPhone, rotateZ: rotatePhone }}
            className="relative z-20 aspect-[9/19] w-full overflow-hidden rounded-[3rem] border-[12px] border-black bg-white shadow-2xl shadow-black/20"
          >
            {/* Notch */}
            <div className="absolute left-1/2 top-0 z-30 h-7 w-1/3 -translate-x-1/2 rounded-b-2xl bg-black" />

            {/* App UI */}
            <div className="flex h-full flex-col bg-[#F9FAFB] pt-14 text-black">
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-black/50 uppercase tracking-wider">Welcome back</p>
                    <p className="text-2xl font-black tracking-tight">Ahmad Logistics</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-black/5 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-black" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 px-6">
                <div className="rounded-2xl bg-black p-5 text-white relative overflow-hidden shadow-lg shadow-black/10">
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Active</p>
                  <p className="mt-2 text-4xl font-black">12</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Balance</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">$4.2K</p>
                </div>
              </div>

              <div className="mt-6 flex-1 px-6 pb-6">
                <div className="h-full rounded-2xl border border-black/5 bg-white p-5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black">Live route</p>
                    <span className="rounded-lg bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-600">In transit</span>
                  </div>

                  <div className="relative mt-6 flex-1 overflow-hidden rounded-xl border border-black/5 bg-[#F9FAFB]">
                    <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover bg-center bg-no-repeat opacity-[0.08]" />
                    
                    {/* Simulated Map Path */}
                    <div className="absolute left-6 right-6 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#D4AF37]"
                        animate={{ width: ['0%', '100%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                    
                    {/* Map Nodes */}
                    <div className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-black shadow-md" />
                    <motion.div 
                      className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[6px] border-white bg-[#D4AF37] shadow-xl"
                      animate={{ left: ['6%', '90%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="absolute right-6 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-black/20" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
