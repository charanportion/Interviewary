import { Footer } from '@/components/Footer';
import { MinimalHeader } from '@/components/MinimalHeader';
import { SUBSCRIPTIONS, LIFETIME, TOPUPS, type Plan } from '@/lib/pricing';

export function Pricing({ checkoutError = false }: { checkoutError?: boolean }) {
  return (
    <>
      <MinimalHeader />
      <main>
        <section className="section section-pad pb-10 text-center">
          <p className="label-eyebrow">Pricing</p>
          <h1 className="display mx-auto mt-3 max-w-2xl text-balance text-[34px] font-semibold leading-tight text-ink sm:text-[44px]">
            Credits that run interviews on our keys — or bring your own.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
            A credit is one minute of a live interview on our Deepgram + Claude keys. Subscribe for
            monthly credits with zero setup, or buy lifetime access and use your own keys with
            starter credits included.
          </p>
          {checkoutError && (
            <p
              className="mx-auto mt-6 max-w-md rounded-lg border px-4 py-2.5 text-sm"
              style={{ borderColor: 'var(--color-weak)', background: 'var(--color-weak-bg)', color: 'var(--color-weak)' }}
            >
              Couldn’t start checkout. Please try again in a moment.
            </p>
          )}
        </section>

        {/* Subscriptions */}
        <section className="section pb-4">
          <SectionHead title="Subscribe" subtitle="Monthly credits · nothing to configure · runs on our keys" />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {SUBSCRIPTIONS.map((p) => (
              <TierCard key={p.slug} plan={p} cta="Subscribe" />
            ))}
          </div>
        </section>

        {/* Lifetime */}
        <section className="section section-pad py-12">
          <SectionHead title="Buy once" subtitle="One-time payment · bring your own keys · starter credits included" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {LIFETIME.map((p) => (
              <TierCard key={p.slug} plan={p} cta="Get lifetime access" byok />
            ))}
          </div>
        </section>

        {/* Top-ups */}
        <section className="section pb-4">
          <SectionHead title="Top-ups" subtitle="One-time credit packs · for anyone, anytime credits run low" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {TOPUPS.map((p) => (
              <div key={p.slug} className="card flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-semibold text-ink">{p.credits.toLocaleString()} credits</div>
                  <div className="text-[13px] text-muted">{p.price}</div>
                </div>
                <a href={`/api/checkout?plan=${p.slug}`} className="btn btn-secondary btn-sm">
                  Buy
                </a>
              </div>
            ))}
          </div>
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
              Prices in INR. Payments and tax handled by Polar (our merchant of record). Cancel a
              subscription anytime from the customer portal.
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

function TierCard({ plan, cta, byok = false }: { plan: Plan; cta: string; byok?: boolean }) {
  return (
    <div
      className={`card relative flex flex-col p-6 ${plan.highlight ? 'ring-2' : ''}`}
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
        <span className="display text-[30px] font-semibold text-ink">{plan.price}</span>
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
