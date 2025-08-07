/**
 * Enhanced Error Handling Utilities
 * Based on React Native and Expo best practices
 */

import { Alert } from 'react-native';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  static logError(error: Error | AppError, context?: string): void {
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: 'stack' in error ? error.stack : undefined,
    };

    // Log to console in development
    if (__DEV__) {
      console.error('App Error:', errorInfo);
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, Bugsnag, Firebase Crashlytics
  }

  static handleAsyncError(
    error: Error | AppError,
    userMessage?: string,
    context?: string
  ): void {
    this.logError(error, context);

    Alert.alert(
      'Error',
      userMessage || 'Something went wrong. Please try again.',
      [{ text: 'OK' }]
    );
  }

  static createAsyncWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorMessage?: string,
    context?: string
  ) {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleAsyncError(
          error as Error,
          errorMessage,
          context || fn.name
        );
        return null;
      }
    };
  }
}

export default ErrorHandler;
