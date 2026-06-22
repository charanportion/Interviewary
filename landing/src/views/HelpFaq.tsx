import type { ReactNode } from 'react';
import { Footer } from '../components/Footer';
import { MinimalHeader } from '../components/MinimalHeader';
import { Reveal } from '../components/Reveal';
import { ChevronIcon } from '../components/icons';
import { CONTACT_EMAIL, PRODUCT_NAME } from '../lib/site';

type QA = { q: string; a: ReactNode };
type Group = { title: string; intro?: string; items: QA[] };

const GROUPS: Group[] = [
  {
    title: 'Audio & recording',
    intro: 'Almost every “it isn’t transcribing” problem comes down to how and where you open the extension. Start here.',
    items: [
      {
        q: 'It isn’t transcribing anything — why?',
        a: (
          <>
            The most common cause: the extension has to be opened <strong>from the Google Meet
            tab</strong>. Click the {PRODUCT_NAME} icon in your Chrome toolbar{' '}
            <strong>while the Meet tab is the active tab</strong> — that single click both opens the
            side panel <em>and</em> grants Chrome’s one-time permission to capture that tab’s audio.
            If you open the panel from any other tab, it has nothing to listen to.
          </>
        ),
      },
      {
        q: 'Should I open it before or after the meeting starts?',
        a: (
          <>
            <strong>After.</strong> Join the Meet call first and make sure audio is actually flowing,
            then click the {PRODUCT_NAME} icon on the Meet tab and press <strong>Start interview</strong>.
            There needs to be live call audio on the tab for it to capture — opening it on an empty
            lobby gives it silence.
          </>
        ),
      },
      {
        q: 'Whose voice does it capture?',
        a: (
          <>
            It captures the audio coming <strong>out of the Meet tab</strong> — that’s the candidate
            (and anyone else on the call). It deliberately does <strong>not</strong> record your own
            microphone. You already know what you asked; {PRODUCT_NAME} only needs to evaluate the
            candidate’s answers.
          </>
        ),
      },
      {
        q: 'I get “No Google Meet tab found” or a permission error.',
        a: (
          <>
            Make sure a <code>https://meet.google.com</code> tab is open, then click the{' '}
            {PRODUCT_NAME} icon in the toolbar <strong>while that Meet tab is focused</strong> and
            press <strong>Start</strong> again. The audio-capture permission is granted per-tab at
            the moment you click the icon — so it has to be clicked on the Meet tab, not from the
            side panel of a different page.
          </>
        ),
      },
      {
        q: 'It was working, then it stopped.',
        a: (
          <>
            Keep the Meet tab open for the whole interview. If the tab was closed or reloaded, the
            capture stream ends — just re-click the {PRODUCT_NAME} icon on the Meet tab and press
            Start again to resume.
          </>
        ),
      },
      {
        q: 'Will I still hear the call while it’s capturing?',
        a: 'Yes. Capturing the tab doesn’t mute it — you and the candidate continue to hear each other exactly as normal.',
      },
      {
        q: 'Does it work on Zoom or Microsoft Teams?',
        a: (
          <>
            No — only <strong>Google Meet</strong> running in a browser tab. The Zoom and Teams
            desktop apps aren’t browser tabs, so their audio can’t be captured this way.
          </>
        ),
      },
      {
        q: 'Is it secretly recording or saving the meeting?',
        a: (
          <>
            No. Audio is streamed for live transcription and then discarded — there’s no saved
            recording, and your transcript, answers, and keys are never sent to us. The only thing
            kept is the report, and only if you choose to download it. (If you opt in to anonymous
            usage analytics in Settings, the extension sends only event counts — never transcripts
            or answers.) See the <a href="/privacy">Privacy Policy</a> and{' '}
            <a href="/security">Security</a> page for the full data flow.
          </>
        ),
      },
    ],
  },
  {
    title: 'Setting up',
    items: [
      {
        q: 'Where do I enter my API keys?',
        a: (
          <>
            Open the side panel, click the gear → <strong>Settings</strong>. Paste your Deepgram key
            and your chosen LLM provider’s key, pick a fast model and a report model, click{' '}
            <strong>Test keys</strong>, then <strong>Save</strong>. Keys are stored on your own
            device and you only do this once. The full walkthrough is in the{' '}
            <a href="/#setup">Setup section</a>.
          </>
        ),
      },
      {
        q: '“Test keys” fails.',
        a: (
          <>
            Double-check the key was pasted in full with no stray spaces, that the provider dropdown
            matches the key you’re using, and that the account has remaining credit and the right
            permissions. Deepgram keys come from{' '}
            <a href="https://console.deepgram.com/" target="_blank" rel="noreferrer">
              console.deepgram.com
            </a>
            .
          </>
        ),
      },
      {
        q: 'Which models should I pick?',
        a: 'Pick a fast, lightweight model as your “fast model” — it runs after every answer and must stay under the ~2-second latency budget. Pick a higher-quality model as your “report model”, since it only runs once at the end where quality matters more than speed.',
      },
    ],
  },
  {
    title: 'During the interview',
    items: [
      {
        q: 'Ratings or follow-up questions aren’t appearing.',
        a: (
          <>
            First confirm transcription is working (see <strong>Audio &amp; recording</strong>
            above) — no transcript means nothing for the AI to evaluate. Then check that your LLM
            key passed <strong>Test keys</strong>. Finally, give it a moment: ratings and follow-ups
            appear a second or two <em>after</em> the candidate finishes speaking.
          </>
        ),
      },
      {
        q: 'How fast is it?',
        a: 'New content is designed to appear within about two seconds of the candidate finishing an answer. Heavier “report” models are slower by design and only run at the end.',
      },
    ],
  },
  {
    title: 'Report & data',
    items: [
      {
        q: 'How do I get the report?',
        a: (
          <>
            Click <strong>End interview</strong>. {PRODUCT_NAME} generates a summary with every
            Q&amp;A, its evaluation, strengths, concerns, and a recommendation, which you can
            download as Markdown or PDF.
          </>
        ),
      },
      {
        q: 'Where does my data go?',
        a: (
          <>
            Only to the providers you configured, using your own keys — never to us. Read the{' '}
            <a href="/privacy">Privacy Policy</a> and <a href="/security">Security</a> page for
            specifics.
          </>
        ),
      },
    ],
  },
];

export function HelpFaq() {
  return (
    <>
      <MinimalHeader />

      <main className="section max-w-3xl py-16 sm:py-20">
        <div className="label-eyebrow mb-3">Help &amp; FAQ</div>
        <h1 className="display text-[34px] font-semibold leading-tight text-ink sm:text-[42px]">
          Troubleshooting &amp; common questions
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
          Most issues — especially “it isn’t recording” — have a quick fix. The golden rule:{' '}
          <strong>join the Meet call, then open {PRODUCT_NAME} by clicking its icon on the Meet tab</strong>,
          so it’s allowed to capture the call’s audio.
        </p>

        {/* Highlighted golden-rule callout */}
        <div
          className="my-8 rounded-xl border p-4 text-[14px] leading-relaxed text-ink-soft"
          style={{ background: 'var(--color-accent-soft)', borderColor: 'transparent' }}
        >
          <strong className="text-ink">Quick fix for “no audio / not transcribing”:</strong> Be in
          the Google Meet call, click the {PRODUCT_NAME} toolbar icon{' '}
          <strong>while the Meet tab is focused</strong> (this grants audio-capture permission for
          that tab), then press <strong>Start interview</strong>. It captures the candidate’s voice
          from the tab — not your microphone.
        </div>

        {GROUPS.map((group) => (
          <Reveal as="section" key={group.title} className="mt-12">
            <h2 className="display text-[22px] font-semibold tracking-[-0.015em] text-ink">
              {group.title}
            </h2>
            {group.intro && (
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{group.intro}</p>
            )}
            <div className="mt-4 flex flex-col gap-3">
              {group.items.map((item) => (
                <details
                  key={item.q}
                  className="card group p-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15.5px] font-semibold text-ink">
                    {item.q}
                    <ChevronIcon className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14px] leading-relaxed text-ink-soft">{item.a}</div>
                </details>
              ))}
            </div>
          </Reveal>
        ))}

        {/* Still stuck */}
        <div className="mt-12 border-t pt-6" style={{ borderColor: 'var(--color-line)' }}>
          <p className="text-[14.5px] text-ink-soft">
            Still stuck? Email us at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium underline decoration-1 underline-offset-2"
              style={{ color: 'var(--color-accent)' }}
            >
              {CONTACT_EMAIL}
            </a>{' '}
            and describe what you see — including any message in the side panel.
          </p>
        </div>
      </main>

      <Footer showCta={false} />
    </>
  );
}
