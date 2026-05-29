// One-click PDF export of the interview report. Fully client-side (jsPDF, no
// DOM capture) so it's robust against Tailwind's oklch/color-mix output. We draw
// a header, a stats line, a rating-distribution bar chart, then the narrative
// rendered from markdown with light formatting.

import { jsPDF } from 'jspdf';
import type { InterviewType, Rating, Seniority } from '@interview-copilot/shared';
import { RATING_ORDER, type ReportMetrics } from './reportMetrics';

type RGB = [number, number, number];

interface Palette {
  ink: RGB;
  soft: RGB;
  muted: RGB;
  line: RGB;
  weak: RGB;
  adequate: RGB;
  strong: RGB;
  exceptional: RGB;
}

const COLORS: Palette = {
  ink: [27, 24, 20],
  soft: [70, 63, 54],
  muted: [140, 132, 117],
  line: [221, 212, 197],
  weak: [178, 58, 75],
  adequate: [151, 100, 0],
  strong: [29, 122, 82],
  exceptional: [75, 63, 176],
};

const RATING_LABEL: Record<Rating, string> = {
  weak: 'Weak',
  adequate: 'Adequate',
  strong: 'Strong',
  exceptional: 'Exceptional',
};

export interface PdfMeta {
  seniority: Seniority;
  interviewType: InterviewType;
  dateIso: string;
}

export function generateReportPdf(
  markdown: string,
  metrics: ReportMetrics,
  meta: PdfMeta,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (space: number) => {
    if (y + space > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  // ---- Header ----
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  setColor(COLORS.ink);
  doc.text('Interview Report', margin, y + 6);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setColor(COLORS.muted);
  doc.text(
    `Interviewary  ·  ${meta.dateIso.slice(0, 10)}  ·  ${cap(meta.seniority)} · ${labelType(meta.interviewType)}`,
    margin,
    y + 6,
  );
  y += 16;
  doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  // ---- Stat line ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(COLORS.soft);
  const stats = [
    `${metrics.evaluated} answers scored`,
    metrics.durationMin ? `${metrics.durationMin} min` : null,
    `${metrics.strongRate}% strong+`,
    `${metrics.topics.length} topics`,
  ].filter(Boolean) as string[];
  doc.text(stats.join('     '), margin, y);
  y += 22;

  // ---- Rating distribution chart ----
  if (metrics.evaluated > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setColor(COLORS.muted);
    doc.text('RATING DISTRIBUTION', margin, y);
    y += 12;

    const max = Math.max(...RATING_ORDER.map((r) => metrics.byRating[r]), 1);
    const labelW = 80;
    const barAreaW = contentW - labelW - 28;
    const rowH = 20;

    for (const rating of RATING_ORDER) {
      const count = metrics.byRating[rating];
      const c = COLORS[rating];
      ensure(rowH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      setColor(COLORS.soft);
      doc.text(RATING_LABEL[rating], margin, y + 9);

      // track
      doc.setFillColor(238, 233, 224);
      doc.roundedRect(margin + labelW, y, barAreaW, 9, 2, 2, 'F');
      // value
      const w = Math.max(count > 0 ? 3 : 0, (count / max) * barAreaW);
      if (w > 0) {
        doc.setFillColor(c[0], c[1], c[2]);
        doc.roundedRect(margin + labelW, y, w, 9, 2, 2, 'F');
      }
      doc.setFont('helvetica', 'bold');
      setColor(COLORS.soft);
      doc.text(String(count), margin + labelW + barAreaW + 8, y + 9);
      y += rowH;
    }
    y += 10;
    doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
    doc.line(margin, y, pageW - margin, y);
    y += 18;
  }

  // ---- Narrative (markdown → formatted text) ----
  renderMarkdown(doc, markdown, { margin, contentW, pageH, getY: () => y, setY: (v) => (y = v), ensure, setColor });

  return doc;
}

export function downloadReportPdf(
  markdown: string,
  metrics: ReportMetrics,
  meta: PdfMeta,
  filename: string,
): void {
  const doc = generateReportPdf(markdown, metrics, meta);
  doc.save(filename);
}

// ---- minimal markdown renderer -------------------------------------------

interface RenderCtx {
  margin: number;
  contentW: number;
  pageH: number;
  getY: () => number;
  setY: (v: number) => void;
  ensure: (space: number) => void;
  setColor: (c: RGB) => void;
}

function renderMarkdown(doc: jsPDF, markdown: string, ctx: RenderCtx): void {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '' || line.trim() === '---') {
      ctx.setY(ctx.getY() + 6);
      continue;
    }

    let text = line;
    let font: 'bold' | 'normal' = 'normal';
    let size = 10.5;
    let color = COLORS.soft;
    let indent = 0;
    let gapBefore = 2;

    if (line.startsWith('### ')) {
      text = strip(line.slice(4));
      font = 'bold';
      size = 11.5;
      color = COLORS.ink;
      gapBefore = 8;
    } else if (line.startsWith('## ')) {
      text = strip(line.slice(3));
      font = 'bold';
      size = 13.5;
      color = COLORS.ink;
      gapBefore = 12;
    } else if (line.startsWith('# ')) {
      text = strip(line.slice(2));
      font = 'bold';
      size = 15.5;
      color = COLORS.ink;
      gapBefore = 12;
    } else if (/^\s*[-*]\s+/.test(line)) {
      text = '•  ' + strip(line.replace(/^\s*[-*]\s+/, ''));
      indent = 10;
    } else {
      text = strip(line);
    }

    ctx.setY(ctx.getY() + gapBefore);
    doc.setFont(size >= 13.5 ? 'times' : 'helvetica', font);
    doc.setFontSize(size);
    ctx.setColor(color);

    const wrapped = doc.splitTextToSize(text, ctx.contentW - indent) as string[];
    const lineH = size * 1.4;
    for (const wl of wrapped) {
      ctx.ensure(lineH);
      doc.text(wl, ctx.margin + indent, ctx.getY() + size * 0.9);
      ctx.setY(ctx.getY() + lineH);
    }
  }
}

// Strip inline markdown emphasis/code/link syntax for the PDF text layer.
function strip(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s*/, '');
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function labelType(t: InterviewType): string {
  return t === 'deep_dive' ? 'Deep dive' : 'Screening';
}
