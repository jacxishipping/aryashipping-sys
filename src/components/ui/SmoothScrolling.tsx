'use client';

/**
 * Keeps page scrolling native so nested application scroll containers—such as
 * the dashboard content area—receive wheel events without Lenis intercepting
 * them before their providers have registered.
 */
export default function SmoothScrolling({ children }: { children: React.ReactNode }) {
  return children;
}
