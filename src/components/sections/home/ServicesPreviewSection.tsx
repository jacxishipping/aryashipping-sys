'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Anchor, Car, ExternalLink, Globe2, ShieldCheck, Ship, Warehouse } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    icon: <Car className="h-6 w-6" />,
    title: 'Vehicle sourcing & transport',
    description: 'We handle everything from auction acquisitions to domestic transport and port delivery.',
    image: '/route-map.jpg',
  },
  {
    icon: <Ship className="h-6 w-6" />,
    title: 'Ocean freight & RORO',
    description: 'Secure transatlantic vessel booking with confirmed space and consistent sailing schedules.',
    image: '/port.jpg', 
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Customs clearance',
    description: 'Expert documentation handling for export clearing and smooth import procedures.',
    image: '/route-map.jpg',
  },
  {
    icon: <Warehouse className="h-6 w-6" />,
    title: 'Secure storage & staging',
    description: 'Short and long-term staging at major ports and hubs to consolidate vehicle shipments.',
    image: '/port.jpg',
  },
];

export default function ServicesPreviewSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section ref={containerRef} className="relative bg-[#F9FAFB] text-gray-900">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 flex h-[35vh] flex-col justify-center bg-[#F9FAFB] px-4 pt-16 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3">
             <div className="h-px w-8 bg-[#D4AF37]" />
             <span className="text-xs font-mono uppercase tracking-widest text-[#D4AF37]">capabilities</span>
          </div>
          <h2 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            End-to-end logistics.<br />
            <span className="text-black/40 italic font-serif font-light tracking-normal">Simplified.</span>
          </h2>
        </motion.div>
      </div>

      {/* Spaced out scrolling content */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-[20vh] mt-10 space-y-[20vh]">
        {services.map((service, index) => {
          return (
            <ServiceCard 
              key={service.title} 
              service={service} 
              index={index} 
              progress={scrollYProgress} 
              total={services.length}
            />
          );
        })}
      </div>
    </section>
  );
}

function ServiceCard({ service, index, progress, total }: { service: any, index: number, progress: any, total: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "start 20%"]
  });

  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const yImage = useTransform(springProgress, [0, 1], [-100, 0]);
  const scaleImage = useTransform(springProgress, [0, 1], [1.2, 1]);
  const opacity = useTransform(springProgress, [0, 0.4], [0, 1]);

  return (
    <motion.div 
      ref={cardRef}
      style={{ opacity }}
      className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-center"
    >
       {/* Left side text */}
       <div className={`flex flex-col justify-center ${index % 2 === 1 ? 'lg:order-2 lg:pl-16' : 'lg:pr-16'}`}>
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[#F9FAFB]/[0.03] border border-black/5 text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.1)]">
            {service.icon}
          </div>
          
          <h3 className="text-3xl font-bold tracking-tight mb-6">{service.title}</h3>
          
          <div className="h-px w-full bg-gradient-to-r from-[#D4AF37]/50 to-transparent mb-6" />
          
          <p className="text-lg text-black/60 leading-relaxed font-medium">
            {service.description}
          </p>

          <Link href="/services" className="mt-10 group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-black/70 hover:text-gray-900 transition-colors w-fit">
            Explore service
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9FAFB]/[0.03] border border-black/5 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-black transition-all">
              <ExternalLink className="h-3 w-3" />
            </div>
          </Link>
       </div>

       {/* Right side Image Parallax Frame */}
       <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] bg-white pointer-events-none ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
          <motion.div 
            style={{ y: yImage, scale: scaleImage }}
            className="absolute inset-0 h-[120%]"
          >
            {/* The SVGs themselves form the visual. No dark overlay needed anymore since they are meant to be light */}
            <div className="absolute inset-0 z-0">
               {index === 0 && <div className="absolute inset-0 bg-[url('/capability-vehicle.svg')] bg-cover bg-center" />}
               {index === 1 && <div className="absolute inset-0 bg-[url('/capability-ocean.svg')] bg-cover bg-center" />}
               {index === 2 && <div className="absolute inset-0 bg-[url('/capability-customs.svg')] bg-cover bg-center" />}
               {index === 3 && <div className="absolute inset-0 bg-[url('/capability-storage.svg')] bg-cover bg-center" />}
            </div>
          </motion.div>
       </div>
    </motion.div>
  );
}
