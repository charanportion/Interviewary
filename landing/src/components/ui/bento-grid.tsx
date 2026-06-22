import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { ArrowRightIcon } from '@/components/icons';

/**
 * Bento layout adapted from Magic UI for this project: uses the warm surface
 * tokens, the project's own arrow icon, and a plain anchor instead of the
 * shadcn Button / radix-icons dependencies.
 */
interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href?: string;
  cta?: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div className={cn('grid w-full auto-rows-[20rem] grid-cols-3 gap-4', className)} {...props}>
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
      'bg-surface [box-shadow:0_0_0_1px_rgba(27,24,20,.04),0_2px_4px_rgba(27,24,20,.05),0_12px_24px_rgba(27,24,20,.05)]',
      className,
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <Icon className="h-8 w-8 origin-left transform-gpu text-[var(--color-accent)] transition-all duration-300 ease-in-out group-hover:scale-90" />
      <h3 className="text-lg font-semibold text-ink">{name}</h3>
      <p className="max-w-lg text-[14px] leading-relaxed text-ink-soft">{description}</p>
    </div>

    {href && cta && (
      <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-accent)]"
        >
          {cta}
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
    )}

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.02]" />
  </div>
);

export { BentoCard, BentoGrid };
