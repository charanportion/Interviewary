'use client';

import { DownloadIcon } from './icons';
import { useDownload } from './DownloadProvider';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'accent';
  label?: string;
  className?: string;
};

/** Opens the lead-capture modal, which records the lead and then serves the .zip. */
export function DownloadButton({
  size = 'md',
  variant = 'primary',
  label = 'Download the extension',
  className = '',
}: Props) {
  const { openDownloadModal } = useDownload();
  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : 'btn-md';
  return (
    <button
      type="button"
      onClick={openDownloadModal}
      className={`btn ${sizeClass} btn-${variant} ${className}`}
    >
      <DownloadIcon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {label}
    </button>
  );
}
