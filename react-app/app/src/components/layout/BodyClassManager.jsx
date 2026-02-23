import { useEffect } from 'react';

export function BodyClassManager({ className }) {
  useEffect(() => {
    const original = document.body.className;
    document.body.className = className;

    return () => {
      document.body.className = original;
    };
  }, [className]);

  return null;
}
