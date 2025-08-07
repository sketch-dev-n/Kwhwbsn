/**
 * Input Validation Utilities
 * Based on React Native and Firebase best practices
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationUtils {
  /**
   * Validate expense amount
   */
  static validateAmount(amount: string): ValidationResult {
    if (!amount || amount.trim() === '') {
      return { isValid: false, error: 'Amount is required' };
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return { isValid: false, error: 'Please enter a valid number' };
    }

    if (numAmount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (numAmount > 1000000) {
      return { isValid: false, error: 'Amount cannot exceed 1,000,000' };
    }

    return { isValid: true };
  }

  /**
   * Validate expense description
   */
  static validateDescription(description: string): ValidationResult {
    if (!description || description.trim() === '') {
      return { isValid: false, error: 'Description is required' };
    }

    if (description.length < 3) {
      return { isValid: false, error: 'Description must be at least 3 characters' };
    }

    if (description.length > 100) {
      return { isValid: false, error: 'Description cannot exceed 100 characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate category selection
   */
  static validateCategory(category: string): ValidationResult {
    if (!category || category.trim() === '') {
      return { isValid: false, error: 'Please select a category' };
    }

    return { isValid: true };
  }

  /**
   * Validate budget amount
   */
  static validateBudgetAmount(amount: string): ValidationResult {
    const result = this.validateAmount(amount);
    if (!result.isValid) {
      return result;
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 100) {
      return { isValid: false, error: 'Budget should be at least $100' };
    }

    return { isValid: true };
  }

  /**
   * Validate email format (for Firebase auth)
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true };
  }

  /**
   * Validate password strength (for Firebase auth)
   */
  static validatePassword(password: string): ValidationResult {
    if (!password || password.trim() === '') {
      return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    return { isValid: true };
  }

  /**
   * Validate form with multiple fields
   */
  static validateForm(fields: Record<string, any>, validators: Record<string, (value: any) => ValidationResult>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validators).forEach(field => {
      const result = validators[field](fields[field]);
      if (!result.isValid) {
        errors[field] = result.error || 'Invalid input';
        isValid = false;
      }
    });

    return { isValid, errors };
  }
}

export default ValidationUtils;
