import type { ReactNode } from 'react';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.tsx';

interface OverlayPanelProps {
  title: string;
  subtitle?: string;
  headerAddon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
  size?: 'default' | 'medium' | 'narrow' | 'compact';
  onClose: () => void;
}

export default function OverlayPanel({
  title,
  subtitle,
  headerAddon,
  actions,
  children,
  bodyClassName,
  contentClassName,
  size = 'default',
  onClose,
}: OverlayPanelProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size={size}
        className={contentClassName}
        onPointerDownOutside={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('[data-overlay-escape-lock]')
          ) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      >
        <DialogHeader>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {subtitle ? <DialogDescription className="mt-0.5">{subtitle}</DialogDescription> : null}
            </div>
            {headerAddon ? <div className="flex min-w-0 items-center gap-1.5">{headerAddon}</div> : null}
            {actions ? <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div> : null}
          </div>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody className={bodyClassName}>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
