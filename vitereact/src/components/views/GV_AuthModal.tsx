import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot_password';
  onSuccess?: () => void;
}

const GV_AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  onSuccess 
}) => {
  // ========== ZUSTAND SELECTORS (CRITICAL: Individual selectors) ==========
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const loginUser = useAppStore(state => state.login_user);
  const registerUser = useAppStore(state => state.register_user);
  const requestPasswordReset = useAppStore(state => state.request_password_reset);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const showToast = useAppStore(state => state.show_toast);

  // ========== LOCAL STATE ==========
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>>(initialMode);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  
  // Password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  // Forgot password form state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<Record<string, string>>({});

  // ========== EFFECTS ==========
  
  // Reset form when mode changes
  useEffect(() => {
    clearAllForms();
    clearAuthError();
  }, [authMode]);

  // Update initial mode when prop changes
  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Calculate password strength in real-time
  useEffect(() => {
    if (registerPassword.length === 0) {
      setPasswordStrength('weak');
      return;
    }

    let strength = 0;
    
    if (registerPassword.length >= 8) strength++;
    if (registerPassword.length >= 12) strength++;
    if (/[a-z]/.test(registerPassword) && /[A-Z]/.test(registerPassword)) strength++;
    if (/\d/.test(registerPassword)) strength++;
    if (/[^a-zA-Z\d]/.test(registerPassword)) strength++;
    
    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [registerPassword]);

  // ========== HELPER FUNCTIONS ==========
  
  const clearAllForms = () => {
    // Clear login form
    setLoginEmail('');
    setLoginPassword('');
    setRememberMe(false);
    setLoginErrors({});
    
    // Clear register form
    setRegisterEmail('');
    setRegisterPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhoneNumber('');
    setTermsAccepted(false);
    setRegisterErrors({});
    
    // Clear forgot password form
    setForgotPasswordEmail('');
    setForgotPasswordSuccess(false);
    setForgotPasswordErrors({});
    
    // Reset password visibility
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
  };

  const handleClose = () => {
    clearAllForms();
    clearAuthError();
    onClose();
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ========== LOGIN HANDLERS ==========
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setLoginErrors({});
    clearAuthError();
    
    // Validate
    const errors: Record<string, string> = {};
    
    if (!loginEmail) {
      errors.email = 'Email is required';
    } else if (!validateEmail(loginEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!loginPassword) {
      errors.password = 'Password is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }
    
    try {
      await loginUser(loginEmail, loginPassword);
      
      // Success - modal will close
      handleClose();
      if (onSuccess) onSuccess();
      
    } catch (error) {
      // Error is handled in store and displayed via errorMessage
      console.error('Login failed:', error);
    }
  };

  // ========== REGISTRATION HANDLERS ==========
  
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setRegisterErrors({});
    clearAuthError();
    
    // Validate
    const errors: Record<string, string> = {};
    
    if (!registerEmail) {
      errors.email = 'Email is required';
    } else if (!validateEmail(registerEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!registerPassword) {
      errors.password = 'Password is required';
    } else if (registerPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (registerPassword !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    if (!fullName) {
      errors.full_name = 'Full name is required';
    }
    
    if (!termsAccepted) {
      errors.terms = 'You must agree to the Terms and Privacy Policy';
    }
    
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }
    
    try {
      await registerUser({
        email: registerEmail,
        password: registerPassword,
        full_name: fullName,
        phone_number: phoneNumber || null,
      });
      
      // Success - modal will close
      handleClose();
      if (onSuccess) onSuccess();
      
    } catch (error) {
      // Error is handled in store
      console.error('Registration failed:', error);
    }
  };

  // ========== FORGOT PASSWORD HANDLERS ==========
  
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setForgotPasswordErrors({});
    
    // Validate
    const errors: Record<string, string> = {};
    
    if (!forgotPasswordEmail) {
      errors.email = 'Email is required';
    } else if (!validateEmail(forgotPasswordEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (Object.keys(errors).length > 0) {
      setForgotPasswordErrors(errors);
      return;
    }
    
    try {
      await requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordSuccess(true);
      
    } catch (error) {
      console.error('Password reset request failed:', error);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  // ========== RENDER ==========
  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Content */}
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="px-8 pt-8 pb-6">
            <h2 id="modal-title" className="text-3xl font-bold text-gray-900 text-center">
              {authMode === 'login' && 'Welcome Back'}
              {authMode === 'register' && 'Create Account'}
              {authMode === 'forgot_password' && 'Reset Password'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {authMode === 'login' && 'Sign in to save properties and contact agents'}
              {authMode === 'register' && 'Join PropConnect to access exclusive features'}
              {authMode === 'forgot_password' && "Enter your email to receive a reset link"}
            </p>
          </div>

          {/* Modal Body - Forms */}
          <div className="px-8 pb-8">
            {/* Global Error Message */}
            {errorMessage && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start" role="alert">
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* ========== LOGIN FORM ========== */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginErrors.email) {
                        setLoginErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="your.email@example.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      loginErrors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {loginErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginErrors.password) {
                          setLoginErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      placeholder="Enter your password"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                        loginErrors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.password}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot_password')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Switch to Register */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ========== REGISTRATION FORM ========== */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (registerErrors.full_name) {
                        setRegisterErrors(prev => ({ ...prev, full_name: '' }));
                      }
                    }}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      registerErrors.full_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {registerErrors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.full_name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      if (registerErrors.email) {
                        setRegisterErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="your.email@example.com"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      registerErrors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {registerErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.email}</p>
                  )}
                </div>

                {/* Phone Number Field */}
                <div>
                  <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(123) 456-7890"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        if (registerErrors.password) {
                          setRegisterErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      placeholder="Create a password"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                        registerErrors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {registerPassword && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                              passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                              'w-full bg-green-500'
                            }`}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength === 'weak' ? 'text-red-600' :
                          passwordStrength === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength === 'weak' ? 'Weak' :
                           passwordStrength === 'medium' ? 'Medium' :
                           'Strong'}
                        </span>
                      </div>
                      {passwordStrength === 'weak' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Use 8+ characters with mix of letters, numbers & symbols
                        </p>
                      )}
                    </div>
                  )}
                  
                  {registerErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (registerErrors.confirm_password) {
                        setRegisterErrors(prev => ({ ...prev, confirm_password: '' }));
                      }
                    }}
                    placeholder="Confirm your password"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      registerErrors.confirm_password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {registerErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.confirm_password}</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (registerErrors.terms) {
                          setRegisterErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      className={`w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                        registerErrors.terms ? 'border-red-300' : ''
                      }`}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {registerErrors.terms && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.terms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl mt-6"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>

                {/* Switch to Login */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ========== FORGOT PASSWORD FORM ========== */}
            {authMode === 'forgot_password' && (
              <>
                {!forgotPasswordSuccess ? (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>

                    {/* Email Field */}
                    <div>
                      <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => {
                          setForgotPasswordEmail(e.target.value);
                          if (forgotPasswordErrors.email) {
                            setForgotPasswordErrors(prev => ({ ...prev, email: '' }));
                          }
                        }}
                        placeholder="your.email@example.com"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                          forgotPasswordErrors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                      />
                      {forgotPasswordErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{forgotPasswordErrors.email}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>

                    {/* Back to Login */}
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    {/* Success State */}
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900">Check Your Email</h3>
                    
                    <p className="text-sm text-gray-600">
                      If an account exists with <strong>{forgotPasswordEmail}</strong>, 
                      we've sent password reset instructions to your inbox.
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      The link will expire in 24 hours. If you don't see the email, check your spam folder.
                    </p>

                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-lg hover:shadow-xl mt-4"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GV_AuthModal;