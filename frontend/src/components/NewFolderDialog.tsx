import { useState } from 'react';
import { Button } from './ui/button.tsx';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';

interface NewFolderDialogProps {
  currentPath: string;
  errorMessage: string | null;
  loading?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function NewFolderDialog({
  currentPath,
  errorMessage,
  loading = false,
  onClose,
  onCreate,
}: NewFolderDialogProps) {
  const [name, setName] = useState('');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="compact" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="min-w-0 flex-1">
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription className="mt-0.5">
              Create a folder in <code>{currentPath}</code>.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-1.5">
            <Input
              autoFocus
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !loading) {
                  event.preventDefault();
                  onCreate(name);
                }
              }}
              placeholder="test_project"
            />
            {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
          </div>
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onCreate(name)} disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
