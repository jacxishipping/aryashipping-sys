export const AnimationDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

export const SpringConfig = {
  default: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  gentle: {
    damping: 25,
    stiffness: 200,
    mass: 1,
  },
  snappy: {
    damping: 15,
    stiffness: 400,
    mass: 0.8,
  },
} as const;

export const EasingPresets = {
  easeOut: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: [0.68, -0.55, 0.265, 1.55],
} as const;

export const AnimationScales = {
  press: 0.97,
  pop: 1.05,
} as const;
