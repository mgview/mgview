import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Button } from './button.tsx';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'default' | 'medium' | 'narrow' | 'compact';
  }
>(({ className, children, size = 'default', style, ...props }, ref) => {
  const anchoredStyle: React.CSSProperties =
    size === 'compact'
      ? { top: '10vh', left: '50%', maxHeight: '80vh', transform: 'translateX(-50%)' }
      : { top: '10vh', left: '50%', height: '80vh', transform: 'translateX(-50%)' };

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{ ...anchoredStyle, ...style }}
      className={cn(
        'fixed z-50 grid w-full gap-3 border border-border bg-popover p-3 shadow-lg',
        'rounded-md',
        size === 'compact' ? 'overflow-auto' : 'grid-rows-[auto_minmax(0,1fr)] overflow-hidden',
        size === 'medium' && 'max-w-[940px]',
        size === 'narrow' && 'max-w-[760px]',
        size === 'compact' && 'max-w-[508px]',
        size === 'default' && 'max-w-[1320px]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-b border-border pb-2', className)}
      {...props}
    />
  );
}

function DialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-6 w-6 shrink-0', className)}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Close</span>
      </Button>
    </DialogPrimitive.Close>
  );
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-xs text-muted-foreground', className)} {...props} />
  );
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 content-start overflow-y-auto', className)} {...props} />;
}

function DialogForm({
  className,
  children,
  actions,
  errorMessage,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  actions: React.ReactNode;
  errorMessage?: string | null;
}) {
  return (
    <div className={cn('grid gap-2', className)} {...props}>
      <div className="grid gap-1.5">
        {children}
        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogCloseButton,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogForm,
};
