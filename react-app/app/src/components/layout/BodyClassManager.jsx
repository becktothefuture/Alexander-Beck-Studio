import { useEffect } from 'react';

function splitClasses(className = '') {
  return String(className).split(/\s+/).map((name) => name.trim()).filter(Boolean);
}

export function BodyClassManager({ className = '', htmlClassName = '' }) {
  useEffect(() => {
    const original = document.body.className;
    const htmlClasses = splitClasses(htmlClassName);

    document.body.className = className;
    htmlClasses.forEach((name) => document.documentElement.classList.add(name));

    return () => {
      document.body.className = original;
      htmlClasses.forEach((name) => document.documentElement.classList.remove(name));
    };
  }, [className, htmlClassName]);

  return null;
}
