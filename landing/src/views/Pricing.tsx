import { Footer } from '@/components/Footer';
import { MinimalHeader } from '@/components/MinimalHeader';
import { Reveal } from '@/components/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { SUBSCRIPTIONS, LIFETIME, TOPUPS, type Plan, type Currency } from '@/lib/pricing';

export function Pricing({
  checkoutError = false,
  currency = 'USD',
}: {
  checkoutError?: boolean;
  currency?: Currency;
}) {
  return (
    <>
      <MinimalHeader />
      <main>
        <section className="relative overflow-hidden">
          <div className="hero-aurora pointer-events-none absolute inset-0 -z-10 opacity-50" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--color-paper))' }}
            aria-hidden
          />
          <Reveal className="section section-pad pb-10 text-center">
            <p className="label-eyebrow">Pricing</p>
            <h1 className="display mx-auto mt-3 max-w-2xl text-balance text-[34px] font-semibold leading-tight text-ink sm:text-[44px]">
              Pick a plan and start interviewing.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
              One credit = one minute of an interview run on our AI. Subscribe for monthly credits
              with nothing to set up — or buy once and bring your own keys to run for free.
            </p>
            {checkoutError && (
              <p
                className="mx-auto mt-6 max-w-md rounded-lg border px-4 py-2.5 text-sm"
                style={{ borderColor: 'var(--color-weak)', background: 'var(--color-weak-bg)', color: 'var(--color-weak)' }}
              >
                Couldn’t start checkout. Please try again in a moment.
              </p>
            )}
          </Reveal>
        </section>

        {/* Subscriptions */}
        <section className="section pb-4">
          <SectionHead title="Subscribe" subtitle="Monthly credits · nothing to set up · runs on our keys" />
          <Stagger className="mt-6 grid gap-5 sm:grid-cols-3" stagger={0.08}>
            {SUBSCRIPTIONS.map((p) => (
              <StaggerItem key={p.slug}>
                <TierCard plan={p} cta="Subscribe" currency={currency} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Lifetime */}
        <section className="section section-pad py-12">
          <SectionHead title="Buy once" subtitle="One-time payment · use your own keys · starter credits included" />
          <Stagger className="mt-6 grid gap-5 sm:grid-cols-2" stagger={0.08}>
            {LIFETIME.map((p) => (
              <StaggerItem key={p.slug}>
                <TierCard plan={p} cta="Get lifetime access" byok currency={currency} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Top-ups */}
        <section className="section pb-4">
          <SectionHead title="Top-ups" subtitle="One-time credit packs · for whenever credits run low" />
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-3" stagger={0.07}>
            {TOPUPS.map((p) => (
              <StaggerItem key={p.slug}>
                <div className="card flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-semibold text-ink">{p.credits.toLocaleString()} credits</div>
                    <div className="text-[13px] text-muted">{p.price[currency]}</div>
                  </div>
                  <a href={`/api/checkout?plan=${p.slug}`} className="btn btn-secondary btn-sm">
                    Buy
                  </a>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* How it works */}
        <section className="section section-pad">
          <div className="card mx-auto max-w-3xl p-6 sm:p-8">
            <h2 className="display text-[22px] font-semibold text-ink">How credits work</h2>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-soft">
              <li className="flex gap-2.5">
                <Dot /> <span><strong className="text-ink">1 credit = 1 interview minute</strong> on our keys (server mode) — covers live transcription and the AI suggestions and ratings for that minute.</span>
              </li>
              <li className="flex gap-2.5">
                <Dot /> <span><strong className="text-ink">Bring your own keys</strong> (lifetime plans) and interviews cost <em>zero</em> credits — you pay your own Deepgram/LLM provider directly.</span>
              </li>
              <li className="flex gap-2.5">
                <Dot /> <span>Credits run out? Switch to your own keys or grab a top-up. Subscriptions refill monthly; lifetime and top-up credits don’t expire.</span>
              </li>
              <li className="flex gap-2.5">
                <Dot /> <span>After paying, you’ll get a <strong className="text-ink">license key</strong> by email. Install the extension, paste the key in Settings, and you’re in.</span>
              </li>
            </ul>
            <p className="mt-5 text-[13px] text-faint">
              Prices shown in {currency === 'INR' ? 'INR (₹)' : 'USD ($)'} based on your location;
              you’re charged in your local currency at checkout. Payments and tax handled by Polar
              (our merchant of record). Cancel a subscription anytime from the customer portal.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="display text-[26px] font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-[14px] text-muted">{subtitle}</p>
    </div>
  );
}

function TierCard({
  plan,
  cta,
  byok = false,
  currency,
}: {
  plan: Plan;
  cta: string;
  byok?: boolean;
  currency: Currency;
}) {
  return (
    <div
      className={`card relative flex h-full flex-col p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] ${plan.highlight ? 'ring-2' : ''}`}
      style={plan.highlight ? ({ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties) : undefined}
    >
      {plan.highlight && (
        <span
          className="chip absolute -top-2.5 left-6 font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Most popular
        </span>
      )}
      <h3 className="display text-lg font-semibold text-ink">{plan.name}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="display text-[30px] font-semibold text-ink">{plan.price[currency]}</span>
        {plan.period && <span className="text-sm text-muted">{plan.period}</span>}
      </div>
      <p className="mt-1 text-[13px] text-ink-soft">
        {plan.credits.toLocaleString()} credits{plan.period === '/mo' ? '/mo' : ''}
        {byok && ' + your own keys'}
      </p>
      <p className="mt-3 text-[13px] text-muted">{plan.audience}</p>
      <a
        href={`/api/checkout?plan=${plan.slug}`}
        className={`btn btn-md mt-6 w-full ${plan.highlight ? 'btn-accent' : 'btn-primary'}`}
      >
        {cta}
      </a>
    </div>
  );
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />;
}
