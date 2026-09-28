'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { SiteMark } from '@/components/brand/SiteLogo';
import Magnetic from '@/components/ui/Magnetic';

const navigation = [
  { name: 'Services', href: '/services' },
  { name: 'Routes', href: '/#route' },
  { name: 'Process', href: '/#process' },
  { name: 'Tracking', href: '/tracking' },
  { name: 'About', href: '/#about' },
  { name: 'Contact', href: '/#contact' },
];

export default function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 100], [0, -100]); // Hide on initial scroll
  // We'll manually handle the sticky/glass state

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`fixed inset-x-0 top-0 z-[100] border-b transition-all duration-500 ease-in-out ${
          isScrolled
            ? 'border-black/5 bg-white/80 backdrop-blur-2xl py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'border-transparent bg-transparent py-6'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          <div className="flex shrink-0 items-center">
            <Magnetic strength={0.4} intensity={0.2}>
              <Link
                href="/"
                className="group relative flex items-center gap-3 transition-opacity hover:opacity-80 outline-none"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-black/10 shadow-xl overflow-hidden">
                  <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 group-hover:translate-y-0" />
                  <SiteMark className="relative z-10 h-6 w-6 text-gray-900 group-hover:text-gray-900 transition-colors duration-500" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">
                  JACXI
                </span>
              </Link>
            </Magnetic>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-black/5 bg-[#F9FAFB]/[0.03] px-2 py-1.5 backdrop-blur-md">
            {navigation.map((item) => (
              <Magnetic key={item.name} strength={0.2} intensity={0.1}>
                <Link
                  href={item.href}
                  className="relative px-5 py-2 text-sm font-semibold text-black/70 transition-colors hover:text-gray-900"
                >
                  {item.name}
                  <span className="absolute inset-x-4 bottom-1 h-px scale-x-0 bg-[#D4AF37] transition-transform duration-300 origin-center hover:scale-x-100" />
                </Link>
              </Magnetic>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <Magnetic>
                <Link
                  href={isAuthenticated ? "/dashboard" : "/auth/signin"}
                  className="text-sm font-bold text-gray-900 transition-colors hover:text-[#D4AF37]"
                >
                  {isAuthenticated ? "Dashboard" : "Sign in"}
                </Link>
              </Magnetic>
              
              {!isAuthenticated && (
                <Magnetic>
                  <Link
                    href="/auth/signup"
                    className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-full bg-white px-6 font-bold text-black"
                  >
                    <div className="absolute inset-0 translate-y-full bg-[#D4AF37] transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                    <span className="relative z-10 transition-colors duration-500 group-hover:text-gray-900">Sign up</span>
                  </Link>
                </Magnetic>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden relative flex h-12 w-12 items-center justify-center rounded-full bg-[#F9FAFB]/5 border border-black/5 text-gray-900 backdrop-blur-md transition-colors hover:bg-[#F9FAFB]/10 outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Fullscreen Mobile Menu (Awwwards Style Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ clipPath: 'circle(0% at 100% 0)' }}
            animate={{ clipPath: 'circle(150% at 100% 0)' }}
            exit={{ clipPath: 'circle(0% at 100% 0)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 z-[200] bg-gray-900 text-white"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            
            <div className="relative flex h-full flex-col px-6 py-8">
              <div className="flex items-center justify-between">
                <SiteMark className="h-8 w-8 text-[#D4AF37]" />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 text-gray-900 hover:bg-[#F9FAFB]/5 transition-colors outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-auto mb-auto flex flex-col gap-6">
                {navigation.map((item, i) => (
                  <motion.div
                     initial={{ opacity: 0, y: 40 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 + (i * 0.1), duration: 0.8, ease: "easeOut" }}
                     key={item.name}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="group flex items-center justify-between text-4xl font-extrabold tracking-tighter"
                    >
                      <span className="relative">
                        {item.name}
                        <span className="absolute -bottom-2 left-0 h-1 w-full scale-x-0 bg-[#D4AF37] transition-transform duration-500 origin-left group-hover:scale-x-100" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="grid gap-4 mt-auto border-t border-black/5 pt-8"
              >
                <Link
                  href={isAuthenticated ? "/dashboard" : "/auth/signin"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center h-14 rounded-xl border border-black/10 font-bold"
                >
                  {isAuthenticated ? "Dashboard" : "Sign in"}
                </Link>
                {!isAuthenticated && (
                   <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center h-14 rounded-xl bg-gray-900 text-gray-900 font-bold"
                  >
                    Sign up
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
