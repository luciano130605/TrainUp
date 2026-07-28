// utils/useMinLoading.js
import { useState, useEffect } from 'react';

export function useMinLoading(ready, minMs = 2000, key) {
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    setMinElapsed(false);
    const t = setTimeout(() => setMinElapsed(true), minMs);
    return () => clearTimeout(t);
  }, [key, minMs]); // key = algo que cambie cuando querés "rearmar" (ej: screen)

  return !ready || !minElapsed;
}