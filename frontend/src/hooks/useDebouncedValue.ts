import { useEffect, useState } from 'react';

// Returns the value once it has stayed the same for delayMs, so a fast typist changes it once.
// applyAtOnce can say that a value needs no waiting, e.g. the empty text of a cleared search
// box. Such a value is returned right away, and it also replaces an older waiting value, so the
// text from before the clearing cannot come back when the user types again.
export function useDebouncedValue<T>(
  value: T,
  delayMs: number,
  applyAtOnce?: (value: T) => boolean,
): T {
  const [settled, setSettled] = useState(value);
  const atOnce = applyAtOnce?.(value) ?? false;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), atOnce ? 0 : delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, atOnce]);

  return atOnce ? value : settled;
}
