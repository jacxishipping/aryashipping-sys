/**
 * Design System - Animation Tokens
 * 
 * Consistent animation durations, easing functions, and transitions.
 */

export const animations = {
  // Duration (in milliseconds)
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
    slowest: 1000,
  },

  // Easing functions
  easing: {
    // Standard easing
    linear: 'linear',
    
    // Ease variants
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Cubic bezier (custom)
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Material Design standard
    smoothIn: 'cubic-bezier(0.4, 0, 1, 1)',        // Deceleration
    smoothOut: 'cubic-bezier(0, 0, 0.2, 1)',       // Acceleration
    
    // Bouncy
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    
    // Sharp (quick attention-grabbing)
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Common transition strings (property + duration + easing)
  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Specific properties
    color: 'color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    background: 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Framer Motion variants
// For use with Framer Motion animations
export const motionVariants = {
  // Fade animations
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },

  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  // Scale animations
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  scaleUp: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },

  // Stagger children
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
} as const;

// MUI Fade timing (for MUI Fade component)
export const muiFadeTiming = {
  fast: 400,
  normal: 600,
  slow: 800,
} as const;

// Keyframe animations
export const keyframes = {
  // Spin
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // Pulse
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },

  // Bounce
  bounce: {
    '0%, 100%': {
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': {
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },

  // Shake (for errors)
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },

  // Shimmer (for loading skeletons)
  shimmer: {
    '0%': { backgroundPosition: '-1000px 0' },
    '100%': { backgroundPosition: '1000px 0' },
  },
} as const;

// Animation guidelines
export const animationGuidelines = {
  // When to use each duration
  durations: {
    instant: 'Immediate feedback, no visible animation',
    fast: 'Micro-interactions, hover states, focus rings',
    normal: 'Standard transitions, page elements',
    slow: 'Large modals, page transitions, complex animations',
    slower: 'Hero animations, onboarding flows',
    slowest: 'Full-page transitions, dramatic effects',
  },

  // When to use each easing
  easings: {
    linear: 'Progress indicators, continuous animations',
    easeOut: 'Enter animations, appearing elements',
    easeIn: 'Exit animations, disappearing elements',
    easeInOut: 'Bi-directional animations, toggles',
    smooth: 'Most UI transitions (Material Design standard)',
    bounce: 'Playful interactions, success confirmations',
    sharp: 'Quick attention-grabbing, alerts',
  },
} as const;

// Type exports
export type Duration = keyof typeof animations.duration;
export type Easing = keyof typeof animations.easing;
export type Transition = keyof typeof animations.transition;
export type MotionVariant = keyof typeof motionVariants;
export type Keyframe = keyof typeof keyframes;
