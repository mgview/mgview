import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui/button.tsx';
import { cn } from '../lib/utils.ts';

interface InlineHelpProps {
  children: ReactNode;
  className?: string;
  label?: string;
  panelClassName?: string;
}

export default function InlineHelp({
  children,
  className,
  label = 'Help',
  panelClassName,
}: InlineHelpProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-5 w-5 shrink-0 rounded-full text-[0.65rem] font-bold"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        ?
      </Button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-60 rounded-md border border-border bg-popover p-2.5 text-[0.72rem] leading-snug text-popover-foreground shadow-md',
            panelClassName
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
