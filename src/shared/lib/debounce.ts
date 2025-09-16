export type DebouncedFunction<F extends (...args: any[]) => any> = {
  (...args: Parameters<F>): void;
  cancel(): void;
};

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
