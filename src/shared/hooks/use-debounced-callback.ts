import { useEffect, useMemo, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DebouncedFunction<F extends (...args: any[]) => any> = {
  (...args: Parameters<F>): void;
  cancel(): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number): DebouncedFunction<F> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  // Add the cancel method to the debounced function
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

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
