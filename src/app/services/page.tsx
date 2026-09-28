import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import LandingScrollAnimator from '@/components/sections/home/LandingScrollAnimator';
import ProvinceCoverageSection from '@/components/sections/home/ProvinceCoverageSection';
import ServicesHeroSection from '@/components/sections/services/ServicesHeroSection';
import ServicesCapabilitiesSection from '@/components/sections/services/ServicesCapabilitiesSection';
import ServicesProcessSection from '@/components/sections/services/ServicesProcessSection';
import ServicesSupportSection from '@/components/sections/services/ServicesSupportSection';
import { auth } from '@/lib/auth';

export default async function ServicesPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth service unavailable — render as unauthenticated
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-[#D4AF37] selection:text-white">
      <Header isAuthenticated={Boolean(session?.user)} />
      <main>
        <LandingScrollAnimator />
        <ServicesHeroSection />
        <ServicesCapabilitiesSection />
        <ServicesProcessSection />
        <ProvinceCoverageSection />
        <ServicesSupportSection />
      </main>
      <Footer />
    </div>
  );
}
