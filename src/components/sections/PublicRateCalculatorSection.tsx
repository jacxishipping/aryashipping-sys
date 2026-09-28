'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronRight, DollarSign, MapPin, Truck } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';

const origins = [
  { id: 'ca-east', name: 'East Coast (NY/NJ/PA)', stateCode: 'NJ' },
  { id: 'ca-west', name: 'West Coast (CA/WA)', stateCode: 'CA' },
  { id: 'canada', name: 'Canada (Toronto/Montreal)', stateCode: null },
  { id: 'tx', name: 'South (TX/FL)', stateCode: 'TX' },
];

const destinations = [
  { id: 'kbl', name: 'Kabul via Mersin', price: 4500, time: '35-45 days' },
  { id: 'hrt', name: 'Herat via UAE', price: 4200, time: '30-40 days' },
  { id: 'kdh', name: 'Kandahar via UAE', price: 4400, time: '30-42 days' },
  { id: 'mez', name: 'Mazar-i-Sharif via Mersin', price: 4600, time: '38-48 days' },
];

const vehicleTypes = [
  { id: 'sedan', name: 'Standard Sedan', multiplier: 1 },
  { id: 'suv', name: 'SUV / Truck', multiplier: 1.25 },
  { id: 'van', name: 'Van / Large Cargo', multiplier: 1.5 },
];

export default function PublicRateCalculatorSection() {
  const [origin, setOrigin] = useState(origins[0]);
  const [dest, setDest] = useState(destinations[0]);
  const [vType, setVType] = useState(vehicleTypes[1]);
  const [originRate, setOriginRate] = useState<number | null>(null);
  const [rateStatus, setRateStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');

  useEffect(() => {
    if (!origin.stateCode) {
      setOriginRate(null);
      setRateStatus('unavailable');
      return;
    }

    const controller = new AbortController();
    setRateStatus('loading');
    fetch(`/api/public/shipping-rate-estimate?originState=${origin.stateCode}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Rate unavailable');
        return response.json();
      })
      .then((data) => {
        const rate = data?.estimate?.averageBaseRate;
        if (typeof rate !== 'number' || rate <= 0) throw new Error('Rate unavailable');
        setOriginRate(rate);
        setRateStatus('available');
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          setOriginRate(null);
          setRateStatus('unavailable');
        }
      });

    return () => controller.abort();
  }, [origin.stateCode]);

  const basePrice = originRate === null ? null : (originRate + dest.price) * vType.multiplier;

  return (
    <section className="relative bg-[#F9FAFB] py-32 text-gray-900 overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-3 justify-center mb-6">
            <span className="h-px w-6 bg-[var(--accent-gold)]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">Estimator</span>
            <span className="h-px w-6 bg-[var(--accent-gold)]" />
          </div>
          <h2 className="text-5xl font-black tracking-tight sm:text-6xl text-gray-900 mb-6">
            Instant lane pricing.
          </h2>
          <p className="text-xl text-black/60">
            Estimates use active shipping price lists where available. A firm quote confirms vehicle, pickup, and destination details.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] items-start">
          
          <div className="space-y-12">
            
            {/* Origin Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-4">01. Origin Zone</p>
              <div className="grid grid-cols-2 gap-4">
                {origins.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setOrigin(o)}
                    aria-pressed={origin.id === o.id}
                    className={`flex items-start p-4 rounded-[1.5rem] border text-left transition-all ${
                      origin.id === o.id 
                        ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5 shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-[var(--accent-gold)]/50'
                        : 'border-black/5 bg-[#F9FAFB]/[0.03] hover:border-white/30'
                    }`}
                  >
                    <MapPin className={`h-5 w-5 shrink-0 mt-0.5 mr-3 ${origin.id === o.id ? 'text-[var(--accent-gold)]' : 'text-black/40'}`} />
                    <span className={`font-semibold ${origin.id === o.id ? 'text-gray-900' : 'text-black/60'}`}>{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-4">02. Destination Route</p>
              <div className="grid grid-cols-2 gap-4">
                {destinations.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDest(d)}
                    aria-pressed={dest.id === d.id}
                    className={`flex flex-col items-start p-4 rounded-[1.5rem] border text-left transition-all ${
                      dest.id === d.id 
                        ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5 shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-[var(--accent-gold)]/50'
                        : 'border-black/5 bg-[#F9FAFB]/[0.03] hover:border-white/30'
                    }`}
                  >
                    <span className={`font-semibold ${dest.id === d.id ? 'text-gray-900' : 'text-black/60'}`}>{d.name}</span>
                    <span className={`text-[11px] font-mono mt-2 px-2 py-1 rounded-full ${dest.id === d.id ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]' : 'bg-[#F9FAFB]/[0.03] text-black/50'}`}>
                      {d.time}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div>
               <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-4">03. Vehicle Class</p>
               <div className="flex gap-4">
                  {vehicleTypes.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVType(v)}
                      aria-pressed={vType.id === v.id}
                      className={`flex-1 flex justify-center py-4 rounded-full border transition-all ${
                        vType.id === v.id
                           ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)] text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                           : 'border-black/5 bg-[#F9FAFB]/[0.03] text-black/60 hover:bg-[#F9FAFB]/5 hover:text-gray-900 font-medium'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
               </div>
            </div>

          </div>

          <motion.div 
            className="sticky top-32 rounded-[3rem] border border-black/5 bg-[#F9FAFB] p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/5 to-transparent pointer-events-none" />
            
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-gold)] mb-12">Estimated Subtotal</p>
            
            <div className="flex items-start text-gray-900 mb-12">
              <span className="text-4xl mt-3 text-black/60 font-light">$</span>
              <AnimatePresence mode='popLayout'>
                <motion.span 
                  key={basePrice}
                  initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 20, filter: 'blur(10px)', position: 'absolute' }}
                  transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
                  className="text-[6rem] font-black tracking-tighter leading-none"
                >
                  {basePrice === null ? '—' : basePrice.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="space-y-4 mb-12 border-t border-black/5 pt-8">
              <div className="flex justify-between text-sm">
                <span className="text-black/60">Origin transport</span>
                <span className="font-mono text-black/80">
                  {originRate === null ? 'Request quote' : `$${(originRate * vType.multiplier).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black/60">Ocean / Export Transit</span>
                <span className="font-mono text-black/80">${(dest.price * vType.multiplier).toLocaleString()}</span>
              </div>
            </div>
            <p className="mb-6 text-sm text-black/60" role="status">
              {rateStatus === 'loading' && 'Checking current origin pricing…'}
              {rateStatus === 'available' && 'Based on currently active origin pricing; destination transit is an estimate.'}
              {rateStatus === 'unavailable' && 'A live rate is not available for this origin. Request a firm quote.'}
            </p>

            <Magnetic className="w-full" style={{ display: 'block' }}>
              <div className="w-full">
                <button 
                  onClick={() => {
                    document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group relative flex w-full h-16 items-center justify-center overflow-hidden rounded-full bg-gray-900 font-bold"
                >
                  <div className="absolute inset-0 bg-[var(--accent-gold)] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                  <span className="relative z-10 text-white transition-colors duration-500 group-hover:text-black">Request exact quote</span>
                </button>
              </div>
            </Magnetic>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
