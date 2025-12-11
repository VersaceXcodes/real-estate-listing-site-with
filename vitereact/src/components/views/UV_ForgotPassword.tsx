import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const UV_ForgotPassword: React.FC = () => {
  // ========== LOCAL STATE ==========
  const [email, setEmail] = useState('');
  const [validation_errors, setValidationErrors] = useState<{ email?: string }>({});
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_success, setSubmitSuccess] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  // ========== GLOBAL STORE SELECTORS (INDIVIDUAL SELECTORS) ==========
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const request_password_reset = useAppStore(state => state.request_password_reset);

  // ========== NAVIGATION ==========
  const navigate = useNavigate();

  // If already authenticated, redirect to account
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/account');
    }
  }, [isAuthenticated, navigate]);

  // ========== VALIDATION ==========
  const validateEmail = (email: string): boolean => {
    const errors: { email?: string } = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== FORM HANDLERS ==========
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear validation error when user starts typing
    if (validation_errors.email) {
      setValidationErrors({});
    }
    
    // Clear previous errors
    if (submit_error) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setSubmitError(null);
    setSubmitSuccess(false);
    
    // Validate email
    if (!validateEmail(email)) {
      return;
    }
    
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      // Call global store action (handles API call)
      await request_password_reset(email);
      
      // Show success state
      setSubmitSuccess(true);
      setIsSubmitting(false);
      
    } catch (error: any) {
      // Handle errors
      setIsSubmitting(false);
      setSubmitError(error.message || 'An error occurred. Please try again.');
    }
  };

  // ========== RENDER ==========
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                Reset Your Password
              </h2>
              <p className="mt-3 text-base text-gray-600 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            {/* Success State */}
            {submit_success ? (
              <div className="px-8 pb-8">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-base font-semibold text-green-800 mb-2">
                        Check Your Email
                      </h3>
                      <p className="text-sm text-green-700 leading-relaxed mb-3">
                        If an account exists with <strong className="font-semibold">{email}</strong>, we've sent password reset instructions to that address.
                      </p>
                      <p className="text-sm text-green-700 leading-relaxed">
                        Please check your inbox and follow the link to reset your password. The link will expire in 24 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    Didn't receive an email? Check your spam folder or try again.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitSuccess(false);
                      setEmail('');
                    }}
                    className="w-full px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-all duration-200"
                  >
                    Try another email
                  </button>

                  <Link
                    to="/login"
                    className="block w-full px-6 py-3 text-sm font-medium text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-gray-300 transition-all duration-200"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-8">
                  {/* Server Error */}
                  {submit_error && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{submit_error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={() => email && validateEmail(email)}
                      placeholder="your.email@example.com"
                      className={`
                        w-full px-4 py-3 text-base
                        border-2 rounded-lg
                        transition-all duration-200
                        focus:outline-none focus:ring-4
                        ${validation_errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }
                      `}
                      disabled={is_submitting}
                      aria-invalid={!!validation_errors.email}
                      aria-describedby={validation_errors.email ? "email-error" : undefined}
                    />
                    
                    {/* Validation Error */}
                    {validation_errors.email && (
                      <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                        {validation_errors.email}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={is_submitting}
                    className="
                      w-full px-6 py-3 
                      text-base font-medium text-white
                      bg-blue-600 hover:bg-blue-700
                      rounded-lg shadow-lg hover:shadow-xl
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      focus:outline-none focus:ring-4 focus:ring-blue-100
                    "
                  >
                    {is_submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending reset link...
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  {/* Back to Login Link */}
                  <div className="mt-6 text-center">
                    <Link
                      to="/login"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Remember your password? Sign in
                    </Link>
                  </div>
                </form>

                {/* Info Section */}
                <div className="px-8 pb-8 pt-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        You will receive an email with instructions on how to reset your password in a few minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Additional Help */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a 
                href="mailto:support@propconnect.com" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;