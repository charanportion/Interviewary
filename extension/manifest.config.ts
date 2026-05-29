import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Interviewary',
  description:
    'Live transcription + AI follow-up questions for technical interviews on Google Meet.',
  version: pkg.version,
  permissions: ['tabCapture', 'activeTab', 'sidePanel', 'storage'],
  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  // Direct browser calls to Deepgram (STT) and the LLM providers. Declaring
  // these grants the extension cross-origin privileges, so the browser does not
  // enforce CORS on these hosts.
  host_permissions: [
    'https://meet.google.com/*',
    'https://api.deepgram.com/*',
    'wss://api.deepgram.com/*',
    'https://api.anthropic.com/*',
    'https://api.openai.com/*',
    'https://generativelanguage.googleapis.com/*',
    'https://api.x.ai/*',
    // Opt-in anonymous usage analytics → the landing site's Next.js API route.
    // The route also returns permissive CORS, so this is belt-and-suspenders.
    // TODO: narrow to the production domain once known (e.g. https://your-domain.com/*).
    'https://*.netlify.app/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_title: 'Open Interviewary',
    default_icon: {
      16: 'public/icons/icon-16.png',
      32: 'public/icons/icon-32.png',
      48: 'public/icons/icon-48.png',
      128: 'public/icons/icon-128.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
});
