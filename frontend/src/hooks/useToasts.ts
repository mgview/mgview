import { useCallback, useState } from 'react';

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const SUCCESS_TOAST_MS = 4000;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, kind: 'success', message }]);
      window.setTimeout(() => {
        dismiss(id);
      }, SUCCESS_TOAST_MS);
    },
    [dismiss]
  );

  const showError = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [
      ...current.filter((toast) => toast.kind !== 'error'),
      { id, kind: 'error', message },
    ]);
  }, []);

  const dismissErrors = useCallback(() => {
    setToasts((current) => current.filter((toast) => toast.kind !== 'error'));
  }, []);

  return {
    toasts,
    dismiss,
    dismissErrors,
    showSuccess,
    showError,
  };
}
