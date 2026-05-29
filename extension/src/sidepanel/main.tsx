import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Bundled fonts (CSP-safe, offline): editorial serif display + legible grotesk body.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import '../styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
