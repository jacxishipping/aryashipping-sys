import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import ContactSection from '@/components/sections/home/ContactSection';
import FAQSection from '@/components/sections/home/FAQSection';
import HeroSection from '@/components/sections/home/HeroSection';
import LandingScrollAnimator from '@/components/sections/home/LandingScrollAnimator';
import MobileAppPromoSection from '@/components/sections/home/MobileAppPromoSection';
import ProcessSection from '@/components/sections/home/ProcessSection';
import ProvinceCoverageSection from '@/components/sections/home/ProvinceCoverageSection';
import PublicRateCalculatorSection from '@/components/sections/PublicRateCalculatorSection';
import RoutesAnimatedSection from '@/components/sections/RoutesAnimatedSection';
import ServicesPreviewSection from '@/components/sections/home/ServicesPreviewSection';
import TestimonialsSection from '@/components/sections/home/TestimonialsSection';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth service unavailable — render landing page as unauthenticated
  }
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-gold)] selection:text-white">
      <Header isAuthenticated={isAuthenticated} />
      <main>
        <LandingScrollAnimator />
        <HeroSection />
        <RoutesAnimatedSection />
        <ServicesPreviewSection />
        <ProcessSection />
        <ProvinceCoverageSection />
        <PublicRateCalculatorSection />
        <MobileAppPromoSection />
        <TestimonialsSection />
        <FAQSection />
        <QuoteFormSection />
        <AboutMiniSection />
        <ContactSection isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
}
