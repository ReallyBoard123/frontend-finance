import { useState, useCallback } from 'react';

export function useDialog<T = undefined>(initialState?: T) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(initialState);

  const openDialog = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    }
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetDialog = useCallback(() => {
    setIsOpen(false);
    setData(initialState);
  }, [initialState]);

  return { isOpen, data, openDialog, closeDialog, resetDialog };
}