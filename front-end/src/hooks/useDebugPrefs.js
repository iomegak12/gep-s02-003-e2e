import { useEffect, useState } from 'react';

const KEY = 'gep.debug.show_correlation_ids';

/** Module-level cache so non-React code (sonner wrapper) can read it too. */
let cached = read();

function read() {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch (_) {
    return false;
  }
}

export function getShowCorrelationIds() {
  return cached;
}

/** Hook for components that want to read/write the flag reactively. */
export function useDebugPrefs() {
  const [showCorrelationIds, setShow] = useState(cached);

  // Keep tabs in sync if the user toggles in another tab.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) {
        cached = e.newValue === 'true';
        setShow(cached);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setShowCorrelationIds = (next) => {
    cached = !!next;
    setShow(cached);
    try { localStorage.setItem(KEY, cached ? 'true' : 'false'); } catch (_) { /* */ }
  };

  return { showCorrelationIds, setShowCorrelationIds };
}
