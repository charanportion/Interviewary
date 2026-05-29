// Tiny file-download helpers (Blob → anchor click). Used by the report screen.

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(markdown: string, filename: string): void {
  downloadTextFile(markdown, filename, 'text/markdown;charset=utf-8');
}

export function reportFilenameBase(dateIso: string): string {
  return `interviewary-report-${dateIso.slice(0, 10)}`;
}
