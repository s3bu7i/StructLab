import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocalPreference, writeLocalPreference } from './localPreferences';

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readLocalPreference(key, initialValue));

  useEffect(() => {
    writeLocalPreference(key, value);
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
