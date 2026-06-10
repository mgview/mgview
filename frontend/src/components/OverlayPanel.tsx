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
  actions?: ReactNode;
  children: ReactNode;
  size?: 'default' | 'medium' | 'narrow' | 'compact';
  onClose: () => void;
}

export default function OverlayPanel({
  title,
  subtitle,
  actions,
  children,
  size = 'default',
  onClose,
}: OverlayPanelProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size={size}
        onPointerDownOutside={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      >
        <DialogHeader>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle ? <DialogDescription className="mt-0.5">{subtitle}</DialogDescription> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
          </div>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
