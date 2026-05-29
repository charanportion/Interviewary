import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Interview Copilot',
  description:
    'Live transcription + AI follow-up questions for technical interviews on Google Meet.',
  version: pkg.version,
  permissions: ['tabCapture', 'activeTab', 'sidePanel', 'storage'],
  host_permissions: ['https://meet.google.com/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_title: 'Open Interview Copilot',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
});
