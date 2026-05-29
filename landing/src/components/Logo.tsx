import { PRODUCT_NAME } from '../lib/site';

/** The extension's header mark: an ink square with a Fraunces "I", + wordmark. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-8 w-8 text-[19px]' : 'h-6 w-6 text-[15px]';
  const word = size === 'lg' ? 'text-[22px]' : 'text-[17px]';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-md bg-ink ${box}`}
        style={{ color: 'var(--color-paper)' }}
        aria-hidden="true"
      >
        <span className="wordmark leading-none">I</span>
      </span>
      <span className={`wordmark ${word} text-ink`}>{PRODUCT_NAME}</span>
    </span>
  );
}
