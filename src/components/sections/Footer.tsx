'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { SiteMark } from '@/components/brand/SiteLogo';
import Magnetic from '@/components/ui/Magnetic';

const footerNavigation = {
  solutions: [
    { name: 'Vehicle sourcing', href: '/services' },
    { name: 'Ocean freight', href: '/services' },
    { name: 'Customs clearance', href: '/services' },
    { name: 'Secure storage', href: '/services' },
  ],
  support: [
    { name: 'FAQ', href: '/#faq' },
    { name: 'Contact us', href: '/#contact' },
    { name: 'Get a quote', href: '/#quote' },
    { name: 'Customer portal', href: '/auth/signin' },
  ],
  company: [
    { name: 'About JACXI', href: '/#about' },
    { name: 'Our process', href: '/#process' },
    { name: 'Corridor routes', href: '/#route' },
  ],
  legal: [
    { name: 'Privacy policy', href: '/legal/app-privacy-policy' },
    { name: 'Terms of service', href: '/legal/app-privacy-policy' },
    { name: 'Cookie policy', href: '/legal/app-privacy-policy' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-[#F9FAFB] pt-32 pb-12 overflow-hidden selection:bg-[var(--accent-gold)] selection:text-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      
      {/* Abstract Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[var(--accent-gold)]/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Giant Typographic CTA */}
        <div className="mb-32 flex flex-col items-center justify-center text-center">
           <motion.h3 
             initial={{ opacity: 0, y: 40 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="text-[4rem] font-black leading-none tracking-tighter text-gray-900 sm:text-[6rem] md:text-[8rem] lg:text-[10rem]"
           >
             READY TO <br/>
             <span className="text-[var(--accent-gold)] font-serif font-light italic tracking-normal">SHIP?</span>
           </motion.h3>
           
           <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: 0.3 }}
             className="-mt-10 sm:-mt-16 md:-mt-24"
           >
            <Magnetic strength={0.4} intensity={0.2}>
              <Link
                href="/#quote"
                className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-gray-900 text-gray-900 shadow-2xl transition-transform hover:scale-110 sm:h-40 sm:w-40"
              >
                <div className="absolute inset-0 rounded-full border border-[var(--accent-gold)] scale-150 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-700 ease-out" />
                <span className="text-sm font-bold uppercase tracking-widest sm:text-base">Start now</span>
              </Link>
            </Magnetic>
           </motion.div>
        </div>

        <div className="grid border-t border-black/5 pt-16 xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <SiteMark className="h-8 text-gray-900 relative z-10" />
            <p className="max-w-xs text-sm leading-relaxed text-black/60">
              Premium vehicle logistics from North America to Afghanistan. Flawless handling through trusted corridors.
            </p>
            <div className="flex gap-x-6">
               <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent-gold)]">© 2026 JACXI SHIPPING</span>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Solutions</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.solutions.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.support.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
