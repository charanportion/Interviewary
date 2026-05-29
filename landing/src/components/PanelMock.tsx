import { Logo } from './Logo';

/**
 * A stylized, static recreation of the extension's side panel built from the
 * real design tokens — shows the product surface without needing a screenshot.
 */
export function PanelMock() {
  return (
    <div
      className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border bg-surface shadow-[var(--shadow-lift)]"
      style={{ borderColor: 'var(--color-line)' }}
      role="img"
      aria-label="Interviewary side panel showing a live answer rating and a suggested follow-up question"
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <Logo />
        <span className="chip" style={{ background: 'var(--color-weak-bg)', color: 'var(--color-weak)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-rec" />
          REC 14:22
        </span>
      </div>

      <div className="flex flex-col gap-3 bg-[var(--color-paper)] p-4">
        {/* Transcript snippet */}
        <div>
          <div className="label-eyebrow mb-1.5">Transcript · Candidate</div>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            “…so I’d reach for a database index on the lookup column. It turns the full
            table scan into a B-tree seek, so reads stay fast even as the table grows…”
          </p>
        </div>

        {/* Evaluation card */}
        <div className="card animate-flash p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label-eyebrow">Answer rating</span>
            <span
              className="chip"
              style={{ background: 'var(--color-strong-bg)', color: 'var(--color-strong)' }}
            >
              ● Strong
            </span>
          </div>
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Names the right mechanism <em>and</em> the trade-off. Correctly connects the
            index to query performance at scale — not a memorized buzzword.
          </p>
        </div>

        {/* Suggested follow-up */}
        <div
          className="card p-3 animate-rise"
          style={{ animationDelay: '120ms', borderColor: 'var(--color-accent-soft)' }}
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className="chip"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              Ask next
            </span>
          </div>
          <p className="text-[13px] font-medium leading-snug text-ink">
            “What’s the downside of adding that index — what does it cost you on writes?”
          </p>
          <p className="mt-1.5 text-[11.5px] leading-snug text-muted">
            Probes depth: a strong answer mentions slower inserts / index maintenance.
          </p>
        </div>
      </div>
    </div>
  );
}
