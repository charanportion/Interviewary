import { LegalLayout } from '../components/LegalLayout';
import { CONTACT_EMAIL, PRODUCT_NAME } from '../lib/site';

export function Security() {
  return (
    <LegalLayout
      current="/security"
      title="Security"
      intro={`${PRODUCT_NAME}’s security model is simple because its architecture is: your interview content never leaves your browser, so there’s no central store of it to breach. Here’s exactly how it’s built and what that means for you.`}
    >
      <h2>1. The architecture is the security model</h2>
      <p>
        The {PRODUCT_NAME} extension is fully client-side, with no user accounts. We never receive
        your API keys, audio, transcripts, résumés, or reports — so there is no central honeypot of
        interview content for an attacker to target. The only data we store is the contact details
        you submit to download the extension and, if you opt in, anonymous usage events
        (see section 4) — both kept in a database protected by insert-only access rules.
      </p>

      <h2>2. Where your keys live</h2>
      <ul>
        <li>
          Your Deepgram and LLM provider keys are stored in <code>chrome.storage.local</code>,
          scoped to the extension on your own device.
        </li>
        <li>They are never transmitted to us and are not synced across devices.</li>
        <li>
          They are sent only to their respective providers’ official API endpoints to authenticate
          your own requests.
        </li>
        <li>
          You can wipe them at any time by clearing the extension’s storage or removing the
          extension.
        </li>
      </ul>

      <h2>3. How your data flows</h2>
      <p>During an interview, data moves directly between your browser and the services you chose:</p>
      <ul>
        <li>
          <strong>Audio → Deepgram.</strong> Tab audio is streamed over an encrypted WebSocket
          (<code>wss://</code>) to Deepgram for transcription.
        </li>
        <li>
          <strong>Transcript + documents → your LLM.</strong> Text is sent over HTTPS to the LLM
          provider you configured to generate questions, evaluations, and the report.
        </li>
        <li>
          <strong>Only opt-in analytics → us.</strong> No copy of your audio, transcript,
          documents, or report is routed through or stored on infrastructure we operate. The sole
          exception is anonymous usage events — and only if you turned analytics on in Settings.
        </li>
      </ul>
      <p>
        The extension requests only the Chrome permissions it needs — tab capture for the Meet
        audio, side panel, active tab, and local storage — plus host permissions limited to the
        transcription and LLM provider domains.
      </p>

      <h2>4. Data retention</h2>
      <p>
        Session data (audio, transcript, evaluations) is held in memory only and is discarded when
        you close the side panel. The single exception is a report you explicitly download, which
        is saved to your computer under your control. Retention of the text you send to providers
        is governed by those providers’ own policies and dashboards.
      </p>
      <p>
        Separately, the two things we <em>do</em> store live in our database (Supabase): the
        contact details you submit to download, and any opt-in anonymous usage events. Both sit
        behind Row-Level Security that permits inserts only — the public key shipped in the app
        cannot read anyone’s rows back. Email us to have your contact details removed.
      </p>

      <h2>5. Your responsibilities</h2>
      <p>Because you hold the keys, a few practices keep you safe:</p>
      <ul>
        <li>Treat your API keys like passwords; don’t share them or commit them anywhere.</li>
        <li>Scope and rotate keys with your providers, and set spending limits where available.</li>
        <li>Only install the extension from the official download on this site.</li>
        <li>
          Obtain any recording/transcription consent required in your and the candidate’s
          jurisdiction.
        </li>
      </ul>

      <h2>6. Responsible disclosure</h2>
      <p>
        We welcome reports from security researchers. If you believe you’ve found a vulnerability in
        the extension or this site, please email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with details and steps to reproduce.
        Please give us a reasonable opportunity to investigate and remediate before any public
        disclosure, and avoid accessing or modifying data that isn’t yours while testing.
      </p>

      <h2>7. Prototype caveat</h2>
      <p>
        {PRODUCT_NAME} is an early prototype and has not undergone a formal third-party security
        audit. Evaluate it accordingly before using it with sensitive candidate information.
      </p>

      <h2>8. Contact</h2>
      <p>
        Security questions or reports: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
