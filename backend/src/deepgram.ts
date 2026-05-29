import { randomUUID } from 'node:crypto';
import {
  createClient,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from '@deepgram/sdk';
import type { TranscriptTurn, Speaker } from '@interview-copilot/shared';

export interface DeepgramSessionOptions {
  // Each Deepgram session captures audio from one known speaker — the tab
  // audio is the candidate, the mic audio is the interviewer. We pass the
  // label in and stamp every turn with it. No diarization heuristic needed.
  speaker: Speaker;
  onTurn: (turn: TranscriptTurn) => void;
  onError: (err: Error) => void;
  logger: {
    info: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
  };
}

export interface DeepgramSession {
  send(chunk: Buffer): void;
  close(): void;
  isReady(): boolean;
}

// Architecture says: nova-3, en-US, smart_format=true, interim_results=false,
// endpointing=300. We drop `diarize` because each session has exactly one
// speaker by construction. We also omit `encoding` so Deepgram auto-detects
// the WebM/Opus container produced by MediaRecorder.
function buildOptions() {
  return {
    model: 'nova-3',
    language: 'en-US',
    smart_format: true,
    interim_results: false,
    endpointing: 300,
    punctuate: true,
  } as const;
}

export function openDeepgramSession(opts: DeepgramSessionOptions): DeepgramSession {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'DEEPGRAM_API_KEY is not set. Add it to backend/.env (copy from .env.example).',
    );
    opts.logger.error({ err: err.message }, 'Deepgram session not started');
    opts.onError(err);
    return {
      send() {},
      close() {},
      isReady: () => false,
    };
  }

  const deepgram = createClient(apiKey);
  const connection: ListenLiveClient = deepgram.listen.live(buildOptions());

  let isOpen = false;
  const pendingChunks: Buffer[] = [];
  let receivedBytes = 0;
  let finalsReceived = 0;

  connection.on(LiveTranscriptionEvents.Open, () => {
    isOpen = true;
    opts.logger.info({ speaker: opts.speaker }, 'Deepgram WS open');
    while (pendingChunks.length > 0) {
      const chunk = pendingChunks.shift();
      if (chunk) connection.send(bufferToArrayBuffer(chunk));
    }
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: DeepgramLiveResult) => {
    if (!data?.is_final) return;
    const text = data.channel?.alternatives?.[0]?.transcript?.trim();
    if (!text) return;

    finalsReceived += 1;
    const startSec = data.start ?? 0;
    const duration = data.duration ?? 0;
    const turn: TranscriptTurn = {
      id: randomUUID(),
      speaker: opts.speaker,
      text,
      startMs: Math.round(startSec * 1000),
      endMs: Math.round((startSec + duration) * 1000),
    };
    opts.logger.info(
      { speaker: opts.speaker, finalsReceived, text },
      'Deepgram final transcript',
    );
    opts.onTurn(turn);
  });

  connection.on(LiveTranscriptionEvents.Metadata, (data: unknown) => {
    opts.logger.info({ speaker: opts.speaker, data }, 'Deepgram metadata');
  });

  connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    opts.logger.error({ speaker: opts.speaker, err: error.message }, 'Deepgram error');
    opts.onError(error);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    isOpen = false;
    opts.logger.info(
      { speaker: opts.speaker, receivedBytes, finalsReceived },
      'Deepgram WS closed',
    );
  });

  return {
    send(chunk: Buffer) {
      receivedBytes += chunk.length;
      if (!isOpen) {
        pendingChunks.push(chunk);
        return;
      }
      connection.send(bufferToArrayBuffer(chunk));
    },
    close() {
      try {
        connection.requestClose();
      } catch (err) {
        opts.logger.warn({ err: (err as Error).message }, 'Deepgram requestClose failed');
      }
    },
    isReady: () => isOpen,
  };
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
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
