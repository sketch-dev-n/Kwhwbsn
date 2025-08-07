import { 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
// Screen dimensions available for future use
// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation constants
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
  VERY_SLOW: 500,
} as const;

export const SPRING_CONFIG = {
  GENTLE: {
    damping: 20,
    stiffness: 90,
    mass: 1,
  },
  BOUNCY: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  SNAPPY: {
    damping: 25,
    stiffness: 200,
    mass: 0.8,
  },
} as const;

export const EASING = {
  EASE_IN_OUT: Easing.bezier(0.4, 0, 0.2, 1),
  EASE_OUT: Easing.bezier(0, 0, 0.2, 1),
  EASE_IN: Easing.bezier(0.4, 0, 1, 1),
  BOUNCE: Easing.bounce,
} as const;

// Common animation presets
export const fadeIn = (duration: number = ANIMATION_DURATION.NORMAL) => 
  withTiming(1, { duration, easing: EASING.EASE_OUT });

export const fadeOut = (duration: number = ANIMATION_DURATION.NORMAL) => 
  withTiming(0, { duration, easing: EASING.EASE_IN });

export const slideInUp = (duration = ANIMATION_DURATION.NORMAL) => 
  withTiming(0, { duration, easing: EASING.EASE_OUT });

export const slideOutDown = (distance = 50, duration = ANIMATION_DURATION.NORMAL) => 
  withTiming(distance, { duration, easing: EASING.EASE_IN });

export const scaleIn = (duration = ANIMATION_DURATION.NORMAL) => 
  withTiming(1, { duration, easing: EASING.EASE_OUT });

export const scaleOut = (duration = ANIMATION_DURATION.NORMAL) => 
  withTiming(0, { duration, easing: EASING.EASE_IN });

// Button press animation
export const buttonPressScale = (scale = 0.95, duration = ANIMATION_DURATION.FAST) => 
  withSequence(
    withTiming(scale, { duration, easing: EASING.EASE_OUT }),
    withTiming(1, { duration, easing: EASING.EASE_OUT })
  );

// Spring animations
export const springIn = (config = SPRING_CONFIG.GENTLE) => 
  withSpring(1, config);

export const springOut = (config = SPRING_CONFIG.GENTLE) => 
  withSpring(0, config);

// Staggered animations
export const staggeredFadeIn = (index: number, delay = 50) => 
  withDelay(index * delay, fadeIn());

export const staggeredSlideIn = (index: number, delay = 50) => 
  withDelay(index * delay, slideInUp());

// Theme transition animations
export const colorTransition = (toValue: string, duration = ANIMATION_DURATION.NORMAL) => 
  withTiming(toValue, { duration, easing: EASING.EASE_IN_OUT });

// Modal animations
export const modalSlideIn = () => ({
  opacity: fadeIn(),
  translateY: slideInUp(),
  scale: withTiming(1, { 
    duration: ANIMATION_DURATION.NORMAL, 
    easing: EASING.EASE_OUT 
  }),
});

export const modalSlideOut = () => ({
  opacity: fadeOut(),
  translateY: slideOutDown(),
  scale: withTiming(0.9, { 
    duration: ANIMATION_DURATION.NORMAL, 
    easing: EASING.EASE_IN 
  }),
});

// Card entrance animations
export const cardEntranceAnimation = (index: number) => ({
  opacity: staggeredFadeIn(index),
  translateY: withDelay(
    index * 50, 
    withTiming(0, { 
      duration: ANIMATION_DURATION.NORMAL, 
      easing: EASING.EASE_OUT 
    })
  ),
  scale: withDelay(
    index * 50,
    withTiming(1, { 
      duration: ANIMATION_DURATION.NORMAL, 
      easing: EASING.EASE_OUT 
    })
  ),
});

// Input focus animations
export const inputFocusAnimation = {
  borderColor: colorTransition,
  scale: withTiming(1.02, { 
    duration: ANIMATION_DURATION.FAST, 
    easing: EASING.EASE_OUT 
  }),
};

export const inputBlurAnimation = {
  scale: withTiming(1, { 
    duration: ANIMATION_DURATION.FAST, 
    easing: EASING.EASE_OUT 
  }),
};

// Toast animations
export const toastSlideIn = () => ({
  opacity: fadeIn(ANIMATION_DURATION.FAST),
  translateY: withTiming(0, { 
    duration: ANIMATION_DURATION.FAST, 
    easing: EASING.EASE_OUT 
  }),
});

export const toastSlideOut = () => ({
  opacity: fadeOut(ANIMATION_DURATION.FAST),
  translateY: withTiming(-100, { 
    duration: ANIMATION_DURATION.FAST, 
    easing: EASING.EASE_IN 
  }),
});

// Chart animations
export const chartBarGrowth = (delay = 0) => 
  withDelay(delay, withTiming(1, { 
    duration: ANIMATION_DURATION.SLOW, 
    easing: EASING.EASE_OUT 
  }));

export const numberCountUp = (
  targetValue: number, 
  duration = ANIMATION_DURATION.SLOW,
  onUpdate?: (value: number) => void
) => {
  'worklet';
  return withTiming(targetValue, { duration, easing: EASING.EASE_OUT }, (finished) => {
    if (finished && onUpdate) {
      runOnJS(onUpdate)(targetValue);
    }
  });
};

// Page transition animations
export const pageTransitionConfig = {
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: ANIMATION_DURATION.NORMAL,
        easing: EASING.EASE_OUT,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: ANIMATION_DURATION.NORMAL,
        easing: EASING.EASE_IN,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
              extrapolate: Extrapolation.CLAMP,
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: Extrapolation.CLAMP,
        }),
      },
    };
  },
};

// Utility functions
export const interpolateColor = (
  animatedValue: any,
  inputRange: number[],
  outputRange: string[]
) => {
  'worklet';
  // Note: For color interpolation, use interpolateColor from react-native-reanimated
  // This is a placeholder - actual color interpolation should use the built-in function
  return outputRange[0]; // Fallback to first color
};

export const createSharedTransition = (tag: string) => ({
  sharedTransitionTag: tag,
  sharedTransitionStyle: {
    transform: [{ scale: withSpring(1, SPRING_CONFIG.GENTLE) }],
    opacity: withTiming(1, { duration: ANIMATION_DURATION.NORMAL }),
  },
});
