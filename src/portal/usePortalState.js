import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocalCollection, writeLocalCollection } from '../auth/session';

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readLocalCollection(key, initialValue));

  useEffect(() => {
    writeLocalCollection(key, value);
  }, [key, value]);

  return [value, setValue];
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const showToast = useCallback((message, type = 'success') => {
    window.clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  return [toast, showToast];
}
