import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Problem } from '@/components/Problem';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Differentiators } from '@/components/Differentiators';
import { SetupGuide } from '@/components/SetupGuide';
import { Faq } from '@/components/Faq';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Differentiators />
        <SetupGuide />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
