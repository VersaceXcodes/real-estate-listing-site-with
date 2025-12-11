import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react';

const UV_ResetPassword: React.FC = () => {
  // CRITICAL: Individual selectors only, no object destructuring
  const resetPassword = useAppStore(state => state.reset_password);
  
  // URL parameters
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State variables matching datamap
  const [token, setToken] = useState<string>('');
  const [new_password, setNewPassword] = useState<string>('');
  const [confirm_password, setConfirmPassword] = useState<string>('');
  const [password_strength, setPasswordStrength] = useState<{ 
    level: 'weak' | 'medium' | 'strong', 
    feedback: string 
  }>({ level: 'weak', feedback: '' });
  const [validation_errors, setValidationErrors] = useState<{
    token?: string;
    new_password?: string;
    confirm_password?: string;
  }>({});
  const [is_submitting, setIsSubmitting] = useState<boolean>(false);
  const [submit_success, setSubmitSuccess] = useState<boolean>(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [token_valid, setTokenValid] = useState<boolean>(true);
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [show_confirm_password, setShowConfirmPassword] = useState<boolean>(false);

  // Extract token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    
    if (!tokenParam || tokenParam.trim() === '') {
      setTokenValid(false);
      setValidationErrors({ 
        token: 'This password reset link is invalid or missing' 
      });
    } else {
      setToken(tokenParam);
      setTokenValid(true);
    }
  }, [searchParams]);

  // Password strength calculation (client-side)
  const calculatePasswordStrength = (password: string): { 
    level: 'weak' | 'medium' | 'strong', 
    feedback: string 
  } => {
    if (!password) {
      return { level: 'weak', feedback: '' };
    }

    let score = 0;
    const criteria: string[] = [];

    if (password.length >= 8) {
      score++;
      criteria.push('length');
    }
    if (password.length >= 12) {
      score++;
    }
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score++;
      criteria.push('mixed case');
    }
    if (/\d/.test(password)) {
      score++;
      criteria.push('numbers');
    }
    if (/[^a-zA-Z\d]/.test(password)) {
      score++;
      criteria.push('special characters');
    }

    if (password.length < 8) {
      return { 
        level: 'weak', 
        feedback: 'Must be at least 8 characters' 
      };
    }
    
    if (score <= 2) {
      return { 
        level: 'weak', 
        feedback: 'Add more characters, numbers, and symbols for security' 
      };
    }
    
    if (score <= 4) {
      return { 
        level: 'medium', 
        feedback: 'Good! Consider adding special characters for extra security' 
      };
    }
    
    return { 
      level: 'strong', 
      feedback: 'Excellent password! Very secure.' 
    };
  };

  // Handle password input change
  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    
    // Real-time strength calculation
    const strength = calculatePasswordStrength(value);
    setPasswordStrength(strength);
    
    // Clear password error when user types
    if (validation_errors.new_password) {
      setValidationErrors(prev => ({ ...prev, new_password: undefined }));
    }
    
    // Re-validate confirmation match if already filled
    if (confirm_password && value !== confirm_password) {
      setValidationErrors(prev => ({ 
        ...prev, 
        confirm_password: 'Passwords do not match' 
      }));
    } else if (confirm_password && value === confirm_password) {
      setValidationErrors(prev => ({ ...prev, confirm_password: undefined }));
    }
  };

  // Handle confirmation password change
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    
    // Clear error when user types
    if (validation_errors.confirm_password) {
      setValidationErrors(prev => ({ ...prev, confirm_password: undefined }));
    }
  };

  // Validate confirmation on blur
  const handleConfirmPasswordBlur = () => {
    if (confirm_password && new_password && confirm_password !== new_password) {
      setValidationErrors(prev => ({ 
        ...prev, 
        confirm_password: 'Passwords do not match' 
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, confirm_password: undefined }));
    }
  };

  // Client-side form validation
  const validatePasswordFields = (): boolean => {
    const errors: typeof validation_errors = {};

    if (!new_password) {
      errors.new_password = 'Please enter a new password';
    } else if (new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (!confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (new_password !== confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit password reset
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setSubmitError(null);
    
    // Client-side validation
    if (!validatePasswordFields()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use global store's reset_password function
      await resetPassword(token, new_password);
      
      // Success
      setSubmitSuccess(true);
      setIsSubmitting(false);
      
      // Auto-redirect to landing page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error: any) {
      setIsSubmitting(false);
      
      // Handle specific error messages
      const errorMessage = error.message || 'Failed to reset password. Please try again.';
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setSubmitError('This password reset link is invalid or has expired. Please request a new one.');
        setTokenValid(false);
      } else {
        setSubmitError(errorMessage);
      }
    }
  };

  // Get strength indicator color classes
  const getStrengthColorClasses = () => {
    switch (password_strength.level) {
      case 'weak':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'strong':
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  // Get strength bar width
  const getStrengthBarWidth = () => {
    switch (password_strength.level) {
      case 'weak':
        return '33%';
      case 'medium':
        return '66%';
      case 'strong':
        return '100%';
    }
  };

  // Get strength bar color
  const getStrengthBarColor = () => {
    switch (password_strength.level) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white shadow-xl rounded-xl overflow-hidden">
            {/* Card Header */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">
                Create New Password
              </h2>
              <p className="text-center text-sm text-gray-600">
                {!token_valid 
                  ? 'This reset link is invalid or has expired'
                  : submit_success
                  ? 'Password reset successful!'
                  : 'Choose a strong password for your account'
                }
              </p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-6">
              {/* Token Invalid State */}
              {!token_valid && (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700">
                        {validation_errors.token || 'This password reset link is invalid or has expired.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Link
                      to="/forgot-password"
                      className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Request New Reset Link
                    </Link>
                    
                    <Link
                      to="/login"
                      className="block w-full text-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-200 border border-gray-300"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              )}

              {/* Success State */}
              {token_valid && submit_success && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <CheckCircle className="w-16 h-16 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Password Reset Successfully!
                    </h3>
                    <p className="text-sm text-green-700">
                      Your password has been updated. Redirecting you to the homepage...
                    </p>
                  </div>
                  
                  <Link
                    to="/"
                    className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Go to Homepage
                  </Link>
                </div>
              )}

              {/* Password Reset Form */}
              {token_valid && !submit_success && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Global Error Message */}
                  {submit_error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3" role="alert" aria-live="polite">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-700">{submit_error}</p>
                      </div>
                    </div>
                  )}

                  {/* New Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="new_password" className="text-sm font-medium text-gray-700">
                        New Password *
                      </label>
                    </div>
                    
                    <div className="relative">
                      <input
                        id="new_password"
                        name="new_password"
                        type={show_password ? 'text' : 'password'}
                        required
                        value={new_password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="Enter your new password"
                        className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                          validation_errors.new_password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                        disabled={is_submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!show_password)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={show_password ? 'Hide password' : 'Show password'}
                      >
                        {show_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Validation Error */}
                    {validation_errors.new_password && (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {validation_errors.new_password}
                      </p>
                    )}
                    
                    {/* Password Strength Indicator */}
                    {new_password && (
                      <div className="mt-3 space-y-2">
                        {/* Strength Bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
                            style={{ width: getStrengthBarWidth() }}
                          />
                        </div>
                        
                        {/* Strength Label */}
                        <div className={`inline-flex items-center px-3 py-1 rounded-md border text-xs font-medium ${getStrengthColorClasses()}`}>
                          <span className="capitalize">{password_strength.level}</span>
                          {password_strength.feedback && (
                            <>
                              <span className="mx-1.5">•</span>
                              <span>{password_strength.feedback}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    
                    <div className="relative">
                      <input
                        id="confirm_password"
                        name="confirm_password"
                        type={show_confirm_password ? 'text' : 'password'}
                        required
                        value={confirm_password}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        onBlur={handleConfirmPasswordBlur}
                        placeholder="Confirm your new password"
                        className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                          validation_errors.confirm_password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                        disabled={is_submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!show_confirm_password)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={show_confirm_password ? 'Hide password' : 'Show password'}
                      >
                        {show_confirm_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Validation Error */}
                    {validation_errors.confirm_password && (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {validation_errors.confirm_password}
                      </p>
                    )}
                    
                    {/* Match Indicator */}
                    {confirm_password && new_password && new_password === confirm_password && (
                      <div className="mt-2 flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <p className="text-sm font-medium">Passwords match</p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={is_submitting}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    {is_submitting ? (
                      <span className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Resetting Password...</span>
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  {/* Password Requirements Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Password Requirements:
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-center space-x-2">
                        <span className={new_password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>•</span>
                        <span>At least 8 characters</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className={/[A-Z]/.test(new_password) && /[a-z]/.test(new_password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                        <span>Mix of uppercase and lowercase letters</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className={/\d/.test(new_password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                        <span>At least one number</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className={/[^a-zA-Z\d]/.test(new_password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                        <span>At least one special character</span>
                      </li>
                    </ul>
                  </div>
                </form>
              )}
            </div>

            {/* Card Footer */}
            {token_valid && !submit_success && (
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <span className="text-gray-600">Remember your password?</span>
                  <Link 
                    to="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Security Notice */}
          {token_valid && !submit_success && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                For your security, this reset link will expire after use or within 24 hours.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ResetPassword;