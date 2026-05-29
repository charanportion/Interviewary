import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Problem } from '@/components/Problem';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Differentiators } from '@/components/Differentiators';
import { SetupGuide } from '@/components/SetupGuide';
import { Faq, FAQS } from '@/components/Faq';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';

// FAQ rich-result structured data, generated from the same source as the visible FAQ.
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqLd} />
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
