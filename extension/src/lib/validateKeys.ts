// "Test keys" support for the settings screen. Confirms both credentials work
// before the user starts an interview, so a bad key doesn't fail mid-demo.

import { generateText } from 'ai';
import type { AppSettings } from '@interview-copilot/shared';
import { getModel } from './llm';

export interface KeyCheck {
  ok: boolean;
  message: string;
}

export interface KeyCheckResult {
  deepgram: KeyCheck;
  llm: KeyCheck;
}

// Open a Deepgram live socket with the token subprotocol and consider the key
// valid if the connection reaches `open`. An auth failure closes immediately
// with a non-1000 code.
function checkDeepgram(apiKey: string): Promise<KeyCheck> {
  return new Promise((resolve) => {
    if (!apiKey.trim()) {
      resolve({ ok: false, message: 'No Deepgram key entered.' });
      return;
    }
    let settled = false;
    const done = (result: KeyCheck) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // ignore
      }
      resolve(result);
    };

    let socket: WebSocket;
    try {
      socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-3', [
        'token',
        apiKey,
      ]);
    } catch (err) {
      resolve({ ok: false, message: err instanceof Error ? err.message : String(err) });
      return;
    }

    const timer = setTimeout(
      () => done({ ok: false, message: 'Timed out connecting to Deepgram.' }),
      8000,
    );

    socket.addEventListener('open', () => done({ ok: true, message: 'Deepgram key OK.' }));
    socket.addEventListener('close', (ev) => {
      if (ev.code === 1000) return; // clean close after our own done()
      done({
        ok: false,
        message: `Deepgram rejected the key (code ${ev.code}${ev.reason ? `: ${ev.reason}` : ''}).`,
      });
    });
    socket.addEventListener('error', () =>
      done({ ok: false, message: 'Could not connect to Deepgram. Check the key.' }),
    );
  });
}

// Minimal 1-token generation against the chosen fast model. Resolves ok if the
// provider accepts the key; surfaces the provider's error message otherwise.
async function checkLlm(settings: AppSettings): Promise<KeyCheck> {
  if (!settings.llmKey.trim()) {
    return { ok: false, message: 'No LLM key entered.' };
  }
  try {
    await generateText({
      model: getModel(settings, 'fast'),
      prompt: 'Reply with the single word: ok',
      maxOutputTokens: 4,
    });
    return { ok: true, message: 'LLM key OK.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: shorten(message) };
  }
}

function shorten(message: string): string {
  const first = message.split('\n')[0] ?? message;
  return first.length > 160 ? first.slice(0, 157) + '…' : first;
}

export async function validateKeys(settings: AppSettings): Promise<KeyCheckResult> {
  const [deepgram, llm] = await Promise.all([
    checkDeepgram(settings.deepgramKey),
    checkLlm(settings),
  ]);
  return { deepgram, llm };
}
