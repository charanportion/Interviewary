import { LegalLayout } from '../components/LegalLayout';
import { CONTACT_EMAIL, PRODUCT_NAME, SUBPROCESSORS } from '../lib/site';

export function PrivacyPolicy() {
  return (
    <LegalLayout
      current="/privacy"
      title="Privacy Policy"
      intro={`${PRODUCT_NAME} is built to collect as little as possible. Your interview content — audio, transcripts, résumés, job descriptions, and API keys — stays on your device and never reaches us. The only things we collect are the contact details you submit to download the extension and, if you opt in, anonymous usage analytics.`}
    >
      <h2>The short version</h2>
      <ul>
        <li>
          <strong>Your interview content never reaches us.</strong> Audio, transcripts, résumés,
          and job descriptions are processed in your browser and sent only to the providers
          <em> you</em> configure, with <em>your</em> keys.
        </li>
        <li>
          <strong>Your API keys stay on your device</strong> in Chrome’s local storage. They are
          never transmitted to us and are not synced.
        </li>
        <li>
          <strong>To download, we ask for your email</strong> (and an optional phone number) so we
          can send setup help and updates. That’s stored in our database.
        </li>
        <li>
          <strong>Usage analytics are opt-in and anonymous.</strong> Off by default; when enabled
          they carry only event counts — never transcripts, answers, keys, or candidate data.
        </li>
      </ul>

      <h2>1. Who we are</h2>
      <p>
        {PRODUCT_NAME} (“we”, “us”) is a Chrome extension that helps interviewers run technical
        interviews on Google Meet. This policy covers both the extension and this marketing
        website. Because the extension is fully client-side and bring-your-own-key, we never
        receive your interview content. We do, however, collect the contact details you give us to
        download the extension and — only if you opt in — anonymous usage analytics, both
        described in section 4.
      </p>

      <h2>2. Information processed by the extension</h2>
      <p>The extension handles the following, all locally in your browser:</p>
      <ul>
        <li>
          <strong>API credentials.</strong> Your Deepgram key and your chosen LLM provider’s key,
          plus your model selections, are stored in <code>chrome.storage.local</code> on your
          machine so you don’t have to re-enter them.
        </li>
        <li>
          <strong>Uploaded documents.</strong> The job description and candidate résumé you upload
          for a session are held in memory only and used to generate questions and evaluations.
        </li>
        <li>
          <strong>Captured audio.</strong> Audio from the active Google Meet tab is captured and
          streamed for transcription while an interview is running.
        </li>
        <li>
          <strong>Transcripts &amp; evaluations.</strong> Generated in real time and held in memory
          for the duration of the session.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> receive, store, log, or transmit any of this to ourselves. It
        lives in your browser and is sent directly to the third-party providers you choose.
      </p>

      <h2>3. Third-party providers (sub-processors)</h2>
      <p>
        To function, the extension sends your data directly from your browser to the services you
        configure. Your use of each is governed by that provider’s own privacy policy and terms:
      </p>
      <ul>
        {SUBPROCESSORS.map((s) => (
          <li key={s.name}>
            <a href={s.href} target="_blank" rel="noreferrer">
              {s.name}
            </a>{' '}
            — {s.role}.
          </li>
        ))}
      </ul>
      <p>
        You only ever send data to the providers you’ve set up. If you select Anthropic as your
        LLM, for example, your transcript text goes to Anthropic and not to the other providers.
      </p>

      <h2>4. The website, downloads &amp; analytics</h2>
      <p>
        This marketing site is a static page hosted on Netlify. It sets no advertising or
        cross-site tracking cookies. There are two ways we collect data here, both stored in our
        database (Supabase):
      </p>
      <h3>Download details</h3>
      <p>
        To download the extension we ask for your <strong>email address</strong> (required), a{' '}
        <strong>phone number</strong> (optional), and your consent. We also record the time, your
        browser’s user-agent, and the referring page. We use this to send setup help and product
        updates and to understand demand. We don’t sell it or share it for advertising.
      </p>
      <h3>Opt-in usage analytics</h3>
      <p>
        The extension can send anonymous usage analytics, but <strong>only if you turn them on</strong>{' '}
        in Settings — they are <strong>off by default</strong>. When enabled, events are tied to a
        random per-install identifier (<em>not</em> your email) and contain only event names and
        coarse counts, such as “interview started”, “interview ended”, the distribution of answer
        ratings, and “report generated”. They <strong>never</strong> include transcripts, answers,
        evidence, your API keys, the job description, the résumé, or any candidate information. You
        can switch analytics off again at any time.
      </p>
      <p>
        Our hosting provider may also collect standard server access logs (such as IP address and
        user-agent) for security and reliability; see{' '}
        <a href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer">
          Netlify’s privacy policy
        </a>
        .
      </p>

      <h2>5. Children</h2>
      <p>
        {PRODUCT_NAME} is a tool for professional hiring and is not directed to anyone under 16. We
        do not knowingly process data from children.
      </p>

      <h2>6. Your rights &amp; your control</h2>
      <p>
        Because your data stays on your device and with providers you control, you hold the
        controls directly:
      </p>
      <ul>
        <li>Delete stored keys and settings by removing the extension or clearing its storage.</li>
        <li>Delete a session by closing the side panel — nothing is retained.</li>
        <li>Turn usage analytics off at any time by unticking the box in Settings.</li>
        <li>
          Ask us to delete the contact details you submitted to download — just email us (below).
        </li>
        <li>
          Exercise data rights over transcripts and prompts through your chosen providers’ own
          dashboards and processes.
        </li>
      </ul>

      <h2>7. Changes</h2>
      <p>
        As this is an evolving prototype, we may update this policy. Material changes will be
        reflected by the “Last updated” date above.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about privacy? Reach us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
