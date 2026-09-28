'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Car, Container, FileCheck, Plane, Search, Truck } from 'lucide-react';
import Link from 'next/link';

const services = [
  {
    icon: <Container className="h-6 w-6" />,
    title: 'Ocean Freight',
    badge: 'Most Popular',
    description:
      'Cost-effective container shipping from USA and Canada export lanes through the selected Mersin or UAE route, then onward support into Afghanistan.',
    visual: 'capability-ocean',
  },
  {
    icon: <Truck className="h-6 w-6" />,
    title: 'Inland Transport',
    badge: 'Full Coverage',
    description:
      'Secure ground transportation coordination from the selected route checkpoint into every province in Afghanistan, including Herat, Kabul, Kandahar, and beyond.',
    visual: 'capability-storage',
  },
  {
    icon: <FileCheck className="h-6 w-6" />,
    title: 'Customs Clearance',
    badge: 'Included',
    description:
      'Complete customs brokerage and documentation handling. We manage all import/export paperwork, duties, and regulatory requirements end-to-end.',
    visual: 'capability-customs',
  },
  {
    icon: <Car className="h-6 w-6" />,
    title: 'Vehicle Shipping Consulting',
    badge: 'Guided',
    description:
      'Advice on route planning, documentation readiness, shipping timelines, and the most suitable transport model for your vehicle.',
    visual: 'capability-vehicle',
  },
  {
    icon: <Plane className="h-6 w-6" />,
    title: 'Air Cargo',
    badge: 'Fastest',
    description:
      'Expedited shipping for time-critical deliveries. Premium handling and the fastest door-to-door transit times available.',
    visual: null,
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: 'Live Tracking',
    badge: 'Live',
    description:
      'Real-time shipment visibility with milestone updates from pickup through the selected Mersin or UAE route and final Afghanistan delivery.',
    visual: null,
  },
];

export default function ServicesCapabilitiesSection() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section ref={containerRef} className="relative bg-[#F9FAFB] text-gray-900">
      {/* Sticky section header */}
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
            End-to-end logistics.
            <br />
            <span className="text-black/40 italic font-serif font-light tracking-normal">Simplified.</span>
          </h2>
        </motion.div>
      </div>

      {/* Scrolling service cards */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-[20vh] mt-10 space-y-[20vh]">
        {services.map((service, index) => (
          <ServiceCard
            key={service.title}
            service={service}
            index={index}
            progress={scrollYProgress}
          />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  index,
  progress,
}: {
  service: (typeof services)[number];
  index: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start 20%'],
  });

  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const yImage = useTransform(springProgress, [0, 1], [-80, 0]);
  const scaleImage = useTransform(springProgress, [0, 1], [1.15, 1]);
  const opacity = useTransform(springProgress, [0, 0.4], [0, 1]);

  const isOdd = index % 2 === 1;

  return (
    <motion.div
      ref={cardRef}
      style={{ opacity }}
      className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-center"
    >
      {/* Text side */}
      <div className={`flex flex-col justify-center ${isOdd ? 'lg:order-2 lg:pl-16' : 'lg:pr-16'}`}>
        {/* Badge */}
        <div className="mb-6 inline-flex self-start rounded-full bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
          {service.badge}
        </div>

        {/* Icon */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[2rem] border border-black/5 bg-white text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.1)]">
          {service.icon}
        </div>

        <h3 className="text-3xl font-extrabold tracking-tight mb-6">{service.title}</h3>

        <div className="h-px w-full bg-gradient-to-r from-[#D4AF37]/50 to-transparent mb-6" />

        <p className="text-lg text-black/60 leading-relaxed font-medium">{service.description}</p>

        <Link
          href="/#quote"
          className="mt-10 group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-black/70 hover:text-gray-900 transition-colors w-fit"
        >
          Get a quote
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/5 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-black transition-all">
            <ArrowRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Visual side */}
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-[2.5rem] bg-white pointer-events-none ${isOdd ? 'lg:order-1' : ''}`}
      >
        <motion.div style={{ y: yImage, scale: scaleImage }} className="absolute inset-0 h-[120%]">
          {service.visual ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('/${service.visual}.svg')` }}
            />
          ) : (
            /* Fallback gradient visual for services without SVGs */
            <div className="absolute inset-0 bg-gradient-to-br from-[#F9FAFB] via-white to-[#D4AF37]/5 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-[#D4AF37]/20 bg-white text-[#D4AF37] shadow-xl">
                {service.icon}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
