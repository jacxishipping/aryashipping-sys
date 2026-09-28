import { useState as reactUseState, useEffect as reactUseEffect, useRef as reactUseRef } from 'react';

export interface UseInViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useInView(options?: UseInViewOptions, hooks = { useState: reactUseState, useEffect: reactUseEffect, useRef: reactUseRef }) {
  const { useState, useEffect, useRef } = hooks;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (options?.once) {
          observer.disconnect();
        }
      } else if (!options?.once) {
        setIsInView(false);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options?.root, options?.rootMargin, options?.threshold, options?.once]);

  return { ref, isInView };
}
