import { useEffect } from 'react';

interface MetaOptions {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown> | null;
}

export function useDocumentMeta({ title, description, jsonLd }: MetaOptions): void {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    const scriptId = 'wicked-json-ld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const current = document.getElementById(scriptId);
      if (current) current.remove();
    };
  }, [title, description, jsonLd]);
}
