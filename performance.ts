/**
 * Performance Optimization Utilities
 * Based on React Native and Expo best practices
 */

import { InteractionManager } from 'react-native';

export class PerformanceUtils {
  /**
   * Defer expensive operations until after interactions are complete
   * Best practice from React Native documentation
   */
  static runAfterInteractions<T>(callback: () => T): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve(callback());
      });
    });
  }

  /**
   * Debounce function for search inputs and frequent operations
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for scroll events and frequent updates
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Measure component render performance
   */
  static measureRender(componentName: string) {
    return {
      start: () => {
        if (__DEV__) {
          console.time(`${componentName} render`);
        }
      },
      end: () => {
        if (__DEV__) {
          console.timeEnd(`${componentName} render`);
        }
      },
    };
  }

  /**
   * Memory-efficient list rendering helper
   */
  static getItemLayout(itemHeight: number) {
    return (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }
}

export default PerformanceUtils;
