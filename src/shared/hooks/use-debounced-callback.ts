import { useEffect, useMemo, useRef } from 'react';
import { debounce, type DebouncedFunction } from '@/shared/lib/debounce';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<F extends (...args: any[]) => any>(callback: F, delay: number) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo<DebouncedFunction<F>>(() => {
    return debounce((...args: Parameters<F>) => callbackRef.current(...args), delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
}
