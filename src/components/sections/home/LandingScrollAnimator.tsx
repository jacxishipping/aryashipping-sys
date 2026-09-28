'use client';

import { useEffect } from 'react';

export default function LandingScrollAnimator() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal, .landing-reveal-soft'));

    if (elements.length === 0) {
      return;
    }

    elements.forEach((element) => {
      if (element.style.animationDelay && !element.style.transitionDelay) {
        element.style.transitionDelay = element.style.animationDelay;
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.14,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return null;
}