import type { ReactNode } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';

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
      <DialogContent size={size} onPointerDownOutside={onClose} onEscapeKeyDown={onClose}>
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {subtitle ? <DialogDescription className="mt-0.5">{subtitle}</DialogDescription> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {actions}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
