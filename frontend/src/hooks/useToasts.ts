import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const SUCCESS_TOAST_MS = 4000;

export function useToasts() {
  const dismiss = useCallback((_id: string) => {
    sonnerToast.dismiss(_id);
  }, []);

  const showSuccess = useCallback((message: string) => {
    sonnerToast.success(message, { duration: SUCCESS_TOAST_MS });
  }, []);

  const showError = useCallback((message: string) => {
    sonnerToast.error(message, { duration: Infinity });
  }, []);

  const dismissErrors = useCallback(() => {
    sonnerToast.dismiss();
  }, []);

  return {
    toasts: [] as Toast[],
    dismiss,
    dismissErrors,
    showSuccess,
    showError,
  };
}
