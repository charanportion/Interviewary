import * as pdfjs from 'pdfjs-dist';
// Vite resolves this to the worker URL; pdfjs uses it to spawn its worker.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PDF_TYPES = new Set(['application/pdf']);
const DOCX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (PDF_TYPES.has(file.type) || name.endsWith('.pdf')) {
    return parsePdf(file);
  }
  if (DOCX_TYPES.has(file.type) || name.endsWith('.docx')) {
    return parseDocx(file);
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return file.text();
  }

  throw new Error(`Unsupported file type: ${file.name} (${file.type || 'unknown'})`);
}

async function parsePdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const text = await page.getTextContent();
    const pageText = text.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ');
    parts.push(pageText);
  }

  await doc.destroy();
  return parts.join('\n\n').replace(/[ \t]+/g, ' ').trim();
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}
