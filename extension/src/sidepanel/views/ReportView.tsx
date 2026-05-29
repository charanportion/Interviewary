import { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Rating } from '@interview-copilot/shared';
import { useStore } from '../store';
import { ratingMeta } from '../ratings';
import {
  computeMetrics,
  headlineFromLevel,
  RATING_ORDER,
  type ReportMetrics,
} from '../../lib/reportMetrics';
import { downloadMarkdown, reportFilenameBase } from '../../lib/download';
import { downloadReportPdf } from '../../lib/reportPdf';

export function ReportView() {
  const reportMarkdown = useStore((s) => s.reportMarkdown);
  const transcript = useStore((s) => s.transcript);
  const evaluations = useStore((s) => s.evaluations);
  const seniority = useStore((s) => s.seniority);
  const interviewType = useStore((s) => s.interviewType);
  const interviewStartMs = useStore((s) => s.interviewStartMs);
  const reportGeneratedAtMs = useStore((s) => s.reportGeneratedAtMs);
  const finishReport = useStore((s) => s.finishReport);

  const metrics = useMemo(
    () =>
      computeMetrics({
        transcript,
        evaluations,
        seniority,
        interviewType,
        startedAtMs: interviewStartMs,
        endedAtMs: reportGeneratedAtMs,
      }),
    [transcript, evaluations, seniority, interviewType, interviewStartMs, reportGeneratedAtMs],
  );

  const dateIso = useMemo(
    () => new Date(reportGeneratedAtMs ?? Date.now()).toISOString(),
    [reportGeneratedAtMs],
  );

  if (!reportMarkdown) return null;

  const base = reportFilenameBase(dateIso);
  const headline = headlineFromLevel(metrics.averageLevel);
  const headlineMeta = ratingMeta(headline.tone);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Headline */}
        <div>
          <span className="label-eyebrow">Interview report</span>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className={`display text-2xl font-semibold ${headlineMeta.text}`}>
              {headline.label}
            </h2>
            <span className="text-xs text-muted">
              {new Date(dateIso).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {metrics.evaluated} answers scored · {cap(seniority)} ·{' '}
            {interviewType === 'deep_dive' ? 'Deep dive' : 'Screening'}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Answers scored" value={String(metrics.evaluated)} />
          <Stat label="Duration" value={metrics.durationMin ? `${metrics.durationMin}m` : '—'} />
          <Stat label="Strong or better" value={`${metrics.strongRate}%`} />
          <Stat label="Topics covered" value={String(metrics.topics.length)} />
        </div>

        {/* Rating distribution */}
        {metrics.evaluated > 0 && (
          <section className="card p-3.5">
            <span className="label-eyebrow">Rating distribution</span>
            <div className="mt-2.5 flex flex-col gap-2">
              {RATING_ORDER.map((rating) => (
                <DistRow
                  key={rating}
                  rating={rating}
                  count={metrics.byRating[rating]}
                  max={Math.max(...RATING_ORDER.map((r) => metrics.byRating[r]), 1)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Answer timeline */}
        {metrics.timeline.length > 1 && (
          <section className="card p-3.5">
            <div className="flex items-center justify-between">
              <span className="label-eyebrow">Answer-by-answer</span>
              <span className="text-[10px] text-faint">weak → exceptional</span>
            </div>
            <Timeline metrics={metrics} />
          </section>
        )}

        {/* Topic chips */}
        {metrics.topics.length > 0 && (
          <section className="card p-3.5">
            <span className="label-eyebrow">Topics covered</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {metrics.topics.map((t) => (
                <span key={t} className="chip chip-topic">
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Narrative */}
        <section className="card p-4">
          <div className="markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{reportMarkdown}</Markdown>
          </div>
        </section>
      </div>

      {/* Action bar */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3">
        <button
          type="button"
          onClick={() => downloadReportPdf(reportMarkdown, metrics, { seniority, interviewType, dateIso }, `${base}.pdf`)}
          className="btn btn-primary btn-md flex-1"
        >
          <DownloadIcon /> PDF
        </button>
        <button
          type="button"
          onClick={() => downloadMarkdown(reportMarkdown, `${base}.md`)}
          className="btn btn-secondary btn-md flex-1"
        >
          <DownloadIcon /> .md
        </button>
        <button
          type="button"
          onClick={finishReport}
          className="btn btn-secondary btn-md"
          title="Start a new interview"
        >
          New
        </button>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="display text-2xl font-semibold leading-none text-ink">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}

function DistRow({ rating, count, max }: { rating: Rating; count: number; max: number }) {
  const meta = ratingMeta(rating);
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[12px] font-medium text-ink-soft">{meta.label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunk">
        <div
          className={`h-full rounded-full ${meta.dot} transition-all`}
          style={{ width: count > 0 ? `${Math.max(pct, 6)}%` : '0%' }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-ink-soft">
        {count}
      </span>
    </div>
  );
}

function Timeline({ metrics }: { metrics: ReportMetrics }) {
  return (
    <div className="mt-3 flex h-20 items-end gap-1">
      {metrics.timeline.map((point, i) => {
        const meta = ratingMeta(point.rating);
        return (
          <div
            key={i}
            className="group relative flex min-w-1.5 flex-1 items-end"
            title={`Q${i + 1}: ${meta.label}`}
          >
            <div
              className={`w-full rounded-sm ${meta.dot} transition-all`}
              style={{ height: `${(point.level / 4) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M10 3v9m0 0 3.2-3.2M10 12 6.8 8.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" strokeLinecap="round" />
    </svg>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
