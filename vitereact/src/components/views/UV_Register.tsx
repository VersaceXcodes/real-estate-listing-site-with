import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

const UV_Register: React.FC = () => {
  // ========== LOCAL STATE ==========
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm_password, setConfirmPassword] = useState('');
  const [full_name, setFullName] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [terms_accepted, setTermsAccepted] = useState(false);
  const [show_password, setShowPassword] = useState(false);
  const [show_confirm_password, setShowConfirmPassword] = useState(false);
  const [validation_errors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirm_password?: string;
    full_name?: string;
    phone_number?: string;
    terms_accepted?: string;
  }>({});
  const [password_strength, setPasswordStrength] = useState<{
    level: 'weak' | 'medium' | 'strong';
    feedback: string;
  }>({ level: 'weak', feedback: '' });
  const [submit_success, setSubmitSuccess] = useState(false);
  
  const navigate = useNavigate();
  
  // ========== GLOBAL STATE ACCESS (INDIVIDUAL SELECTORS) ==========
  const is_loading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const error_message = useAppStore(state => state.authentication_state.error_message);
  const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const register_user = useAppStore(state => state.register_user);
  const clear_auth_error = useAppStore(state => state.clear_auth_error);
  
  // ========== REDIRECT IF ALREADY AUTHENTICATED ==========
  useEffect(() => {
    if (is_authenticated) {
      navigate('/account');
    }
  }, [is_authenticated, navigate]);
  
  // ========== PASSWORD STRENGTH CALCULATION ==========
  const calculatePasswordStrength = (pwd: string): { level: 'weak' | 'medium' | 'strong'; feedback: string } => {
    if (!pwd) return { level: 'weak', feedback: '' };
    
    let strength = 0;
    const feedback_items: string[] = [];
    
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) {
      strength++;
    } else {
      feedback_items.push('Mix uppercase and lowercase');
    }
    if (/\d/.test(pwd)) {
      strength++;
    } else {
      feedback_items.push('Add numbers');
    }
    if (/[^a-zA-Z\d]/.test(pwd)) {
      strength++;
    } else {
      feedback_items.push('Add symbols');
    }
    
    if (strength <= 2) return { level: 'weak', feedback: feedback_items.join(', ') || 'Password is weak' };
    if (strength <= 4) return { level: 'medium', feedback: 'Good! Consider adding more variety' };
    return { level: 'strong', feedback: 'Strong password!' };
  };
  
  // ========== PASSWORD CHANGE HANDLER ==========
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
    
    // Clear password error when user types
    if (validation_errors.password) {
      setValidationErrors(prev => ({ ...prev, password: undefined }));
    }
  };
  
  // ========== FORM VALIDATION ==========
  const validateForm = (): boolean => {
    const errors: typeof validation_errors = {};
    
    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (password.length > 100) {
      errors.password = 'Password must be less than 100 characters';
    }
    
    // Confirm password validation
    if (!confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (password !== confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    // Full name validation
    if (!full_name || full_name.trim().length === 0) {
      errors.full_name = 'Full name is required';
    } else if (full_name.length > 255) {
      errors.full_name = 'Name must be less than 255 characters';
    }
    
    // Phone number validation (optional but if provided, must be valid)
    if (phone_number && phone_number.length > 20) {
      errors.phone_number = 'Phone number must be less than 20 characters';
    }
    
    // Terms acceptance validation
    if (!terms_accepted) {
      errors.terms_accepted = 'You must accept the Terms and Privacy Policy to continue';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ========== FORM SUBMISSION ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clear_auth_error();
    
    // Client-side validation
    if (!validateForm()) {
      return;
    }
    
    try {
      // Call global store action
      await register_user({
        email,
        password,
        full_name,
        phone_number: phone_number || null
      });
      
      // Success - show verification prompt
      setSubmitSuccess(true);
      
    } catch (error: any) {
      // Error handled by store, displayed via error_message
      console.error('Registration error:', error);
      
      // Check for specific error codes
      if (error.message?.includes('already exists') || error.message?.includes('EMAIL_EXISTS')) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists'
        }));
      }
    }
  };
  
  // ========== PASSWORD STRENGTH STYLES ==========
  const getPasswordStrengthColor = () => {
    switch (password_strength.level) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };
  
  const getPasswordStrengthWidth = () => {
    switch (password_strength.level) {
      case 'weak': return 'w-1/3';
      case 'medium': return 'w-2/3';
      case 'strong': return 'w-full';
      default: return 'w-0';
    }
  };
  
  // ========== RENDER ==========
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="text-3xl font-bold text-blue-600">PropConnect</h1>
            </Link>
          </div>
          
          {/* Registration Card */}
          <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="px-8 py-10">
              {submit_success ? (
                // ========== SUCCESS STATE ==========
                <div className="text-center">
                  <div className="mb-6">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Account Created Successfully!
                  </h2>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-sm text-blue-900 font-medium mb-2">
                          Almost there! We've sent a verification email to:
                        </p>
                        <p className="text-sm font-semibold text-blue-700 mb-3">
                          {email}
                        </p>
                        <p className="text-sm text-blue-800">
                          Please check your inbox and click the verification link to activate your account.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Continue to Sign In
                    </button>
                    
                    <Link
                      to="/"
                      className="block w-full text-center text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                    >
                      Browse Properties
                    </Link>
                  </div>
                  
                  <p className="mt-6 text-xs text-gray-500">
                    Didn't receive the email? Check your spam folder or contact support.
                  </p>
                </div>
              ) : (
                // ========== REGISTRATION FORM ==========
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                      Create Your Account
                    </h2>
                    <p className="mt-3 text-base text-gray-600 leading-relaxed">
                      Save your favorite properties and track inquiries
                    </p>
                  </div>
                  
                  {/* Server Error Message */}
                  {error_message && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error_message}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name Field */}
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={full_name}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (validation_errors.full_name) {
                            setValidationErrors(prev => ({ ...prev, full_name: undefined }));
                          }
                        }}
                        placeholder="Enter your full name"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          validation_errors.full_name
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.full_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.full_name}
                        </p>
                      )}
                    </div>
                    
                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (validation_errors.email) {
                            setValidationErrors(prev => ({ ...prev, email: undefined }));
                          }
                          clear_auth_error();
                        }}
                        placeholder="your.email@example.com"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          validation_errors.email
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.email}
                        </p>
                      )}
                    </div>
                    
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={show_password ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          placeholder="Create a password (min. 8 characters)"
                          className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                            validation_errors.password
                              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!show_password)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {show_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">Password Strength</span>
                            <span className={`text-xs font-semibold ${
                              password_strength.level === 'weak' ? 'text-red-600' :
                              password_strength.level === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {password_strength.level.toUpperCase()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getPasswordStrengthColor()} ${getPasswordStrengthWidth()}`}
                            />
                          </div>
                          {password_strength.feedback && (
                            <p className="mt-2 text-xs text-gray-600">
                              {password_strength.feedback}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {validation_errors.password && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.password}
                        </p>
                      )}
                    </div>
                    
                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          id="confirm_password"
                          name="confirm_password"
                          type={show_confirm_password ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={confirm_password}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (validation_errors.confirm_password) {
                              setValidationErrors(prev => ({ ...prev, confirm_password: undefined }));
                            }
                          }}
                          placeholder="Re-enter your password"
                          className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                            validation_errors.confirm_password
                              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!show_confirm_password)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {show_confirm_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {validation_errors.confirm_password && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.confirm_password}
                        </p>
                      )}
                    </div>
                    
                    {/* Phone Number Field (Optional) */}
                    <div>
                      <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        id="phone_number"
                        name="phone_number"
                        type="tel"
                        value={phone_number}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (validation_errors.phone_number) {
                            setValidationErrors(prev => ({ ...prev, phone_number: undefined }));
                          }
                        }}
                        placeholder="(123) 456-7890"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          validation_errors.phone_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.phone_number && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.phone_number}
                        </p>
                      )}
                    </div>
                    
                    {/* Terms Acceptance */}
                    <div>
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="terms_accepted"
                            name="terms_accepted"
                            type="checkbox"
                            checked={terms_accepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (validation_errors.terms_accepted) {
                                setValidationErrors(prev => ({ ...prev, terms_accepted: undefined }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </div>
                        <div className="ml-3">
                          <label htmlFor="terms_accepted" className="text-sm text-gray-700">
                            I agree to the{' '}
                            <Link
                              to="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Terms of Service
                            </Link>
                            {' '}and{' '}
                            <Link
                              to="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Privacy Policy
                            </Link>
                          </label>
                        </div>
                      </div>
                      {validation_errors.terms_accepted && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validation_errors.terms_accepted}
                        </p>
                      )}
                    </div>
                    
                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={is_loading}
                        className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        {is_loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </button>
                    </div>
                  </form>
                  
                  {/* Sign In Link */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <Link
                        to="/login"
                        className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Sign In
                      </Link>
                    </p>
                  </div>
                  
                  {/* Agent Registration Link */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-sm text-center text-gray-600">
                      Are you a Real Estate Agent?{' '}
                      <Link
                        to="/agent/register"
                        className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Join as an Agent
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Footer Note */}
          {!submit_success && (
            <p className="mt-6 text-center text-xs text-gray-500">
              By creating an account, you agree to receive communications about properties and platform updates.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_Register;