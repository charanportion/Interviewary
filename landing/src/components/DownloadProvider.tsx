'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { DOWNLOAD_HREF } from '../lib/site';
import { LeadModal } from './LeadModal';

const LEAD_FLAG = 'interviewary_lead'; // set once a visitor has submitted the form

type DownloadContextValue = { openDownloadModal: () => void };

const DownloadContext = createContext<DownloadContextValue | null>(null);

/** Triggers the actual .zip download without navigating. */
export function triggerZipDownload() {
  const a = document.createElement('a');
  a.href = DOWNLOAD_HREF;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDownloadModal = useCallback(() => {
    // Returning visitors who already gave their details skip straight to the file.
    let alreadyCaptured = false;
    try {
      alreadyCaptured = localStorage.getItem(LEAD_FLAG) === '1';
    } catch {
      /* localStorage blocked — just show the form */
    }
    if (alreadyCaptured) {
      triggerZipDownload();
      return;
    }
    setOpen(true);
  }, []);

  return (
    <DownloadContext.Provider value={{ openDownloadModal }}>
      {children}
      {open && (
        <LeadModal
          onClose={() => setOpen(false)}
          onCaptured={() => {
            try {
              localStorage.setItem(LEAD_FLAG, '1');
            } catch {
              /* ignore */
            }
            triggerZipDownload();
          }}
        />
      )}
    </DownloadContext.Provider>
  );
}

export function useDownload(): DownloadContextValue {
  const ctx = useContext(DownloadContext);
  // Fallback so a stray DownloadButton outside the provider still downloads.
  return ctx ?? { openDownloadModal: triggerZipDownload };
}
