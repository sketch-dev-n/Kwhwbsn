import React, { forwardRef } from 'react';
import { Pressable, View, ViewStyle, PressableProps, StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { MotiView, MotiText } from 'moti';
import { Button as PaperButton } from 'react-native-paper';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING } from '../../utils/animations';

// Animated Pressable with scale feedback
interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  scaleValue?: number;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
  onPress?: (event: any) => void;
}

export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(
  function AnimatedPressable({ children, scaleValue = 0.95, style, onPress, hapticFeedback = true, ...props }, ref) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = () => {
      scale.value = withTiming(scaleValue, {
        duration: ANIMATION_DURATION.FAST,
        easing: EASING.EASE_OUT,
      });
      opacity.value = withTiming(0.8, {
        duration: ANIMATION_DURATION.FAST,
      });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, SPRING_CONFIG.SNAPPY);
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION.FAST,
      });
    };

    const handlePress = (event: any) => {
      if (hapticFeedback) {
        // Add haptic feedback if available
        try {
          import('expo-haptics').then(({ impactAsync, ImpactFeedbackStyle }) => {
            runOnJS(() => impactAsync(ImpactFeedbackStyle.Light))();
          });
        } catch {
          // Haptics not available, continue without
        }
      }
      onPress?.(event);
    };

    return (
      <Pressable
        ref={ref}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        {...props}
      >
        <Animated.View style={[style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }
);

// Animated Card with entrance animation
interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  from?: 'bottom' | 'top' | 'left' | 'right' | 'scale';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  style,
  from = 'bottom',
}) => {
  const getInitialTransform = () => {
    switch (from) {
      case 'bottom':
        return { translateY: 50, opacity: 0, scale: 0.95 };
      case 'top':
        return { translateY: -50, opacity: 0, scale: 0.95 };
      case 'left':
        return { translateX: -50, opacity: 0, scale: 0.95 };
      case 'right':
        return { translateX: 50, opacity: 0, scale: 0.95 };
      case 'scale':
        return { scale: 0.8, opacity: 0 };
      default:
        return { translateY: 50, opacity: 0, scale: 0.95 };
    }
  };

  return (
    <MotiView
      from={getInitialTransform()}
      animate={{
        translateY: 0,
        translateX: 0,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: 'timing',
        duration: ANIMATION_DURATION.NORMAL,
        delay,
        easing: EASING.EASE_OUT,
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
};

// Animated Button with loading and success states
interface AnimatedButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  mode?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  loading = false,
  success = false,
  onPress,
  style,
  mode = 'contained',
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const buttonWidth = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: buttonWidth.value * 200 + 50, // Simple linear interpolation
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, SPRING_CONFIG.SNAPPY);
    setTimeout(() => {
      scale.value = withSpring(1, SPRING_CONFIG.SNAPPY);
    }, 100);
    onPress?.();
  };

  React.useEffect(() => {
    if (loading) {
      buttonWidth.value = withTiming(0.8, {
        duration: ANIMATION_DURATION.NORMAL,
        easing: EASING.EASE_OUT,
      });
    } else {
      buttonWidth.value = withTiming(1, {
        duration: ANIMATION_DURATION.NORMAL,
        easing: EASING.EASE_OUT,
      });
    }
  }, [loading, buttonWidth]);

  return (
    <Animated.View style={[animatedStyle]}>
      <PaperButton
        mode={mode}
        onPress={handlePress}
        loading={loading}
        disabled={disabled || loading}
        style={style}
      >
        {success ? '✓ Success' : children}
      </PaperButton>
    </Animated.View>
  );
};

// Animated Text Input with focus effects
interface AnimatedTextInputProps {
  children: React.ReactNode;
  focused?: boolean;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  children,
  focused = false,
  error = false,
  style,
}) => {
  return (
    <MotiView
      animate={{
        scale: focused ? 1.02 : 1,
        borderWidth: focused ? 2 : 1,
      }}
      transition={{
        type: 'timing',
        duration: ANIMATION_DURATION.FAST,
        easing: EASING.EASE_OUT,
      }}
      style={[
        {
          borderRadius: 12,
          borderColor: error ? '#ff4444' : focused ? '#6366f1' : '#e5e7eb',
        },
        style,
      ]}
    >
      {children}
    </MotiView>
  );
};

// Animated List Item with staggered entrance
interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index,
  style,
}) => {
  return (
    <MotiView
      from={{
        opacity: 0,
        translateY: 30,
        scale: 0.95,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
        scale: 1,
      }}
      transition={{
        type: 'timing',
        duration: ANIMATION_DURATION.NORMAL,
        delay: index * 50,
        easing: EASING.EASE_OUT,
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
};

// Animated Modal with backdrop
interface AnimatedModalProps {
  visible: boolean;
  children: React.ReactNode;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  children,
  onDismiss,
  style,
}) => {
  if (!visible) return null;

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'timing',
        duration: ANIMATION_DURATION.FAST,
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <AnimatedPressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onPress={onDismiss}
      >
        <View style={{ flex: 1 }} />
      </AnimatedPressable>

      <MotiView
        from={{
          opacity: 0,
          scale: 0.9,
          translateY: 50,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          translateY: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.9,
          translateY: 50,
        }}
        transition={{
          type: 'spring',
          ...SPRING_CONFIG.GENTLE,
        }}
        style={[
          {
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
            margin: 20,
            maxHeight: '80%',
            width: '90%',
          },
          style,
        ]}
      >
        {children}
      </MotiView>
    </MotiView>
  );
};

// Animated Number Counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = ANIMATION_DURATION.SLOW,
  style,
  textStyle,
  prefix = '',
  suffix = '',
}) => {
  const animatedValue = useSharedValue(0);

  React.useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: EASING.EASE_OUT,
    });
  }, [value, animatedValue, duration]);

  return (
    <MotiText
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        ...SPRING_CONFIG.GENTLE,
      }}
      style={textStyle}
    >
      {prefix}{value}{suffix}
    </MotiText>
  );
};

// Animated Progress Bar
interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 4,
  backgroundColor = '#e5e7eb',
  progressColor = '#6366f1',
  style,
}) => {
  return (
    <View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${progress * 100}%` }}
        transition={{
          type: 'timing',
          duration: ANIMATION_DURATION.SLOW,
          easing: EASING.EASE_OUT,
        }}
        style={{
          height: '100%',
          backgroundColor: progressColor,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};
