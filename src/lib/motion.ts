import type { Transition, Variants } from 'framer-motion';

export const defaultEase: Transition['ease'] = [0.22, 1, 0.36, 1];

export const makeSmooth = (transition?: Partial<Transition>): Transition => ({
  duration: 0.8,
  ease: defaultEase,
  ...transition,
});

export const defaultViewport = { once: true, amount: 0.3 } as const;

export const fadeInUp = (options?: {
  distance?: number;
  delay?: number;
  duration?: number;
}): Variants => {
  const { distance = 32, delay = 0, duration } = options ?? {};

  return {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: makeSmooth({ delay, duration }),
    },
  };
};

export const fadeIn = (options?: {
  delay?: number;
  duration?: number;
}): Variants => {
  const { delay = 0, duration } = options ?? {};

  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: makeSmooth({ delay, duration }),
    },
  };
};

export const scaleIn = (options?: {
  start?: number;
  delay?: number;
  duration?: number;
}): Variants => {
  const { start = 0.95, delay = 0, duration } = options ?? {};

  return {
    hidden: { opacity: 0, scale: start },
    show: {
      opacity: 1,
      scale: 1,
      transition: makeSmooth({ delay, duration }),
    },
  };
};

export const stagger = (options?: {
  staggerChildren?: number;
  delayChildren?: number;
}): Variants => {
  const { staggerChildren = 0.12, delayChildren = 0 } = options ?? {};

  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
};

export const hoverSpring: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 24,
  mass: 0.8,
};

export const floatSpring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 18,
  mass: 0.6,
};

