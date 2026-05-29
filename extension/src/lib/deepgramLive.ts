// Deepgram live transcription, straight from the browser — no backend.
//
// The browser's native WebSocket can't set an Authorization header, so Deepgram
// accepts the key via the Sec-WebSocket-Protocol subprotocol: ['token', <key>].
// (This is exactly what the Deepgram JS SDK does internally in the browser, so
// we skip the SDK and its Node polyfills entirely.)
//
// We only transcribe the candidate: chrome.tabCapture gives us the Meet tab's
// output audio, which in the interviewer's browser is the candidate's voice.

import type { Speaker, TranscriptTurn } from '@interview-copilot/shared';

const DEEPGRAM_BASE = 'wss://api.deepgram.com/v1/listen';

// Architecture says: nova-3, en-US, smart_format=true, interim_results=false,
// endpointing=300. We omit `encoding` so Deepgram auto-detects the WebM/Opus
// container produced by MediaRecorder.
function buildUrl(): string {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en-US',
    smart_format: 'true',
    interim_results: 'false',
    endpointing: '300',
    punctuate: 'true',
  });
  return `${DEEPGRAM_BASE}?${params.toString()}`;
}

export interface DeepgramLiveOptions {
  apiKey: string;
  speaker: Speaker;
  onTurn: (turn: TranscriptTurn) => void;
  onError: (err: Error) => void;
}

export interface DeepgramLiveSession {
  send(chunk: Blob | ArrayBuffer): void;
  close(): void;
  isReady(): boolean;
}

export function openDeepgramLive(opts: DeepgramLiveOptions): DeepgramLiveSession {
  if (!opts.apiKey) {
    const err = new Error('Deepgram API key is missing. Add it in Settings.');
    opts.onError(err);
    return { send() {}, close() {}, isReady: () => false };
  }

  let socket: WebSocket;
  try {
    socket = new WebSocket(buildUrl(), ['token', opts.apiKey]);
  } catch (err) {
    opts.onError(err instanceof Error ? err : new Error(String(err)));
    return { send() {}, close() {}, isReady: () => false };
  }

  let isOpen = false;
  let closed = false;
  const pending: (Blob | ArrayBuffer)[] = [];

  socket.addEventListener('open', () => {
    isOpen = true;
    while (pending.length > 0) {
      const chunk = pending.shift();
      if (chunk) socket.send(chunk);
    }
  });

  socket.addEventListener('message', (ev) => {
    if (typeof ev.data !== 'string') return;
    let data: DeepgramLiveResult;
    try {
      data = JSON.parse(ev.data) as DeepgramLiveResult;
    } catch {
      return;
    }
    if (!data?.is_final) return;
    const text = data.channel?.alternatives?.[0]?.transcript?.trim();
    if (!text) return;

    const startSec = data.start ?? 0;
    const duration = data.duration ?? 0;
    opts.onTurn({
      id: crypto.randomUUID(),
      speaker: opts.speaker,
      text,
      startMs: Math.round(startSec * 1000),
      endMs: Math.round((startSec + duration) * 1000),
    });
  });

  socket.addEventListener('error', () => {
    // The error event carries no useful detail in browsers; report a generic
    // message. Auth failures surface as an immediate close with code 1008/4xxx.
    if (!closed) opts.onError(new Error('Deepgram connection error. Check your Deepgram key.'));
  });

  socket.addEventListener('close', (ev) => {
    isOpen = false;
    if (!closed && ev.code !== 1000) {
      opts.onError(
        new Error(
          `Deepgram closed the connection (code ${ev.code}${ev.reason ? `: ${ev.reason}` : ''}).`,
        ),
      );
    }
  });

  return {
    send(chunk) {
      if (closed) return;
      if (!isOpen) {
        pending.push(chunk);
        return;
      }
      socket.send(chunk);
    },
    close() {
      closed = true;
      try {
        // Ask Deepgram to flush and close cleanly, then close the socket.
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'CloseStream' }));
        }
        socket.close(1000);
      } catch {
        // ignore
      }
    },
    isReady: () => isOpen,
  };
}

interface DeepgramLiveResult {
  is_final?: boolean;
  start?: number;
  duration?: number;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
    }>;
  };
}
