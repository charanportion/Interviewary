import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Providers } from '@/components/Providers';
import { Problem } from '@/components/Problem';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Differentiators } from '@/components/Differentiators';
import { SetupGuide } from '@/components/SetupGuide';
import { Faq, FAQS } from '@/components/Faq';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { getCountry, currencyForCountry } from '@/lib/geo';
import { SUBSCRIPTIONS } from '@/lib/pricing';

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ cc?: string }>;
}) {
  const sp = await searchParams;
  // ?cc=IN overrides geo for testing; otherwise resolve from request headers.
  const currency = currencyForCountry(sp.cc ?? (await getCountry()));
  const startingPrice = SUBSCRIPTIONS[0].price[currency];

  return (
    <>
      <JsonLd data={faqLd} />
      <Nav />
      <main>
        <Hero startingPrice={startingPrice} />
        <Providers />
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
