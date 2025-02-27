import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: unknown, fallbackMessage = 'An error occurred') => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    toast.error(message);
    setError(message);
    console.error(error);
    return message;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}