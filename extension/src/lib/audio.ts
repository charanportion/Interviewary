// Tab audio capture for Google Meet, MV3-style.
//
// chrome.tabCapture captures what plays OUT of the Meet tab. In the
// interviewer's browser, that's the candidate's voice coming back through
// Meet's servers — exactly what we want to transcribe. The interviewer's
// own mic is intentionally NOT captured (the recruiter knows what they
// asked; we only need to evaluate what the candidate said).

const MEET_URL_PATTERN = /^https:\/\/meet\.google\.com\//;
const RECORDER_TIMESLICE_MS = 250;
const RECORDER_MIME = 'audio/webm;codecs=opus';

export interface AudioCaptureHandle {
  stop(): void;
}

export interface StartAudioCaptureOptions {
  onChunk(blob: Blob): void;
  onError(err: Error): void;
}

interface InvokedTabRecord {
  id: number;
  url: string | null;
  windowId: number | null;
  at: number;
}

let active: AudioCaptureHandle | null = null;

export async function startAudio(opts: StartAudioCaptureOptions): Promise<void> {
  if (active) return;
  active = await startAudioCapture(opts);
}

export function stopAudio(): void {
  active?.stop();
  active = null;
}

export function isAudioActive(): boolean {
  return active !== null;
}

export async function startAudioCapture(
  opts: StartAudioCaptureOptions,
): Promise<AudioCaptureHandle> {
  const target = await resolveMeetTab();
  console.log('[audio] resolved target tab', target);

  const streamId = await requestStreamId(target.id);
  console.log('[audio] got streamId', { length: streamId.length });

  const stream = await openTabStream(streamId);
  console.log('[audio] got MediaStream', {
    tracks: stream.getTracks().map((t) => ({ kind: t.kind, label: t.label, readyState: t.readyState })),
  });

  const audioCleanup = keepTabAudible(stream);
  const recorder = startRecorder(stream, opts.onChunk, opts.onError);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch (err) {
        console.warn('MediaRecorder.stop failed', err);
      }
      audioCleanup();
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

async function resolveMeetTab(): Promise<{ id: number; url: string | null; source: string }> {
  // First-choice source: the tab the user clicked the icon on. The SW records
  // this in chrome.storage.session — see extension/src/background/index.ts.
  const stored = await readInvokedTab();
  console.log('[audio] storage.lastInvokedTab', stored);
  if (stored) {
    const tab = await safeGetTab(stored.id);
    console.log('[audio] tabs.get(invoked)', tab);
    if (tab && typeof tab.id === 'number') {
      const url = tab.url ?? tab.pendingUrl ?? '';
      if (MEET_URL_PATTERN.test(url)) {
        return { id: tab.id, url, source: 'storage' };
      }
    }
  }

  const allMatches = await chrome.tabs.query({});
  const candidates = allMatches
    .filter((t) => typeof t.id === 'number' && MEET_URL_PATTERN.test(t.url ?? ''))
    .map((t) => ({ id: t.id!, url: t.url!, active: t.active, windowId: t.windowId }));
  console.log('[audio] all Meet candidates', candidates);

  const activeCand = candidates.find((c) => c.active) ?? candidates[0];
  if (activeCand) {
    return { id: activeCand.id, url: activeCand.url, source: 'query-meet' };
  }

  throw new Error(
    'No Google Meet tab found. Open a Meet tab, click the extension icon on that tab, then click Start.',
  );
}

async function readInvokedTab(): Promise<InvokedTabRecord | null> {
  try {
    const { lastInvokedTab } = (await chrome.storage.session.get('lastInvokedTab')) as {
      lastInvokedTab?: InvokedTabRecord;
    };
    return lastInvokedTab ?? null;
  } catch (err) {
    console.warn('[audio] storage.session.get failed', err);
    return null;
  }
}

async function safeGetTab(tabId: number): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

async function requestStreamId(targetTabId: number): Promise<string> {
  console.log('[audio] calling chrome.tabCapture.getMediaStreamId', { targetTabId });
  return new Promise<string>((resolve, reject) => {
    try {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId },
        (streamId: string | undefined) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const message = lastError.message ?? 'tabCapture failed';
            console.error('[audio] getMediaStreamId failed', { raw: message, targetTabId });
            reject(translateTabCaptureError(message));
            return;
          }
          if (!streamId) {
            reject(new Error('tabCapture.getMediaStreamId returned no streamId'));
            return;
          }
          resolve(streamId);
        },
      );
    } catch (err) {
      console.error('[audio] getMediaStreamId threw', err);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

function translateTabCaptureError(raw: string): Error {
  if (/has not been invoked|activeTab|tabCapture/i.test(raw)) {
    return new Error(
      'Audio capture needs permission for this Meet tab. Click the extension icon (top-right toolbar) ' +
        'while focused on the Meet tab, then click Start again. ' +
        `(Chrome said: "${raw}")`,
    );
  }
  return new Error(`Audio capture failed: ${raw}`);
}

async function openTabStream(streamId: string): Promise<MediaStream> {
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  } as unknown as MediaStreamConstraints;
  return navigator.mediaDevices.getUserMedia(constraints);
}

function keepTabAudible(stream: MediaStream): () => void {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  source.connect(ctx.destination);
  return () => {
    source.disconnect();
    void ctx.close();
  };
}

function startRecorder(
  stream: MediaStream,
  onChunk: (blob: Blob) => void,
  onError: (err: Error) => void,
): MediaRecorder {
  if (!MediaRecorder.isTypeSupported(RECORDER_MIME)) {
    throw new Error(`MediaRecorder does not support ${RECORDER_MIME} on this browser.`);
  }
  const recorder = new MediaRecorder(stream, { mimeType: RECORDER_MIME });
  let chunkCount = 0;

  recorder.addEventListener('dataavailable', (ev) => {
    if (!ev.data || ev.data.size === 0) return;
    chunkCount += 1;
    if (chunkCount === 1 || chunkCount % 40 === 0) {
      console.log(`[audio] chunk #${chunkCount}`, { size: ev.data.size });
    }
    onChunk(ev.data);
  });
  recorder.addEventListener('error', (ev) => {
    const err = (ev as { error?: Error }).error ?? new Error('MediaRecorder error');
    onError(err);
  });

  recorder.start(RECORDER_TIMESLICE_MS);
  return recorder;
}
