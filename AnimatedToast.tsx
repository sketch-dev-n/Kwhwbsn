import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION_DURATION, EASING } from '../../utils/animations';

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onHide?: () => void;
}

interface AnimatedToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const getToastConfig = (type: ToastConfig['type']) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: '#10b981',
        icon: 'checkmark-circle' as const,
        iconColor: '#ffffff',
      };
    case 'error':
      return {
        backgroundColor: '#ef4444',
        icon: 'close-circle' as const,
        iconColor: '#ffffff',
      };
    case 'warning':
      return {
        backgroundColor: '#f59e0b',
        icon: 'warning' as const,
        iconColor: '#ffffff',
      };
    case 'info':
      return {
        backgroundColor: '#3b82f6',
        icon: 'information-circle' as const,
        iconColor: '#ffffff',
      };
    default:
      return {
        backgroundColor: '#6b7280',
        icon: 'information-circle' as const,
        iconColor: '#ffffff',
      };
  }
};

export const AnimatedToast: React.FC<AnimatedToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 3000,
  onHide,
}) => {
  const config = getToastConfig(type);

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <MotiView
      from={{
        opacity: 0,
        translateY: -100,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        translateY: -100,
        scale: 0.9,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 150,
        mass: 1,
      }}
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        <MotiView
          from={{ scale: 0, rotate: '180deg' }}
          animate={{ scale: 1, rotate: '0deg' }}
          transition={{
            type: 'spring',
            delay: 100,
            damping: 15,
            stiffness: 200,
          }}
        >
          <Ionicons
            name={config.icon}
            size={24}
            color={config.iconColor}
            style={styles.icon}
          />
        </MotiView>

        <View style={styles.textContainer}>
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: ANIMATION_DURATION.NORMAL,
              delay: 150,
              easing: EASING.EASE_OUT,
            }}
          >
            <Text style={styles.title}>{title}</Text>
          </MotiView>

          {message && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: ANIMATION_DURATION.NORMAL,
                delay: 200,
                easing: EASING.EASE_OUT,
              }}
            >
              <Text style={styles.message}>{message}</Text>
            </MotiView>
          )}
        </View>
      </View>

      {/* Progress bar for duration */}
      {duration > 0 && (
        <MotiView
          from={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{
            type: 'timing',
            duration: duration,
            easing: EASING.EASE_IN_OUT,
          }}
          style={[
            styles.progressBar,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
          ]}
        />
      )}
    </MotiView>
  );
};

// Toast Manager Hook
let toastRef: { show: (config: ToastConfig) => void } | null = null;

export const useToast = () => {
  const show = (config: ToastConfig) => {
    toastRef?.show(config);
  };

  return { show };
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Array<ToastConfig & { id: string; visible: boolean }>>([]);

  const show = React.useCallback((config: ToastConfig) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...config, id, visible: true }]);
  }, []);

  const hide = React.useCallback((id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, visible: false } : toast
    ));
    
    // Remove from array after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, ANIMATION_DURATION.NORMAL);
  }, []);

  React.useEffect(() => {
    toastRef = { show };
    return () => {
      toastRef = null;
    };
  }, [show]);

  return (
    <>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => (
          <AnimatedToast
            key={toast.id}
            {...toast}
            onHide={() => hide(toast.id)}
          />
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  container: {
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
