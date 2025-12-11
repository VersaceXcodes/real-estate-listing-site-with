import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, AlertCircle, Home } from 'lucide-react';

const UV_AgentLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    credentials?: string;
  }>({});
  
  // CRITICAL: Individual selectors, NO object destructuring
  const isAgent = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const loginAgent = useAppStore(state => state.login_agent);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  
  // Get redirect URL from query params or default to dashboard
  const redirectUrl = searchParams.get('redirect_url') || '/agent/dashboard';
  
  // Redirect if already authenticated as agent
  useEffect(() => {
    if (isAgent) {
      navigate(redirectUrl);
    }
  }, [isAgent, navigate, redirectUrl]);
  
  // Clear error when user types
  useEffect(() => {
    if (errorMessage) {
      clearAuthError();
    }
  }, [email, password]);
  
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    clearAuthError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      await loginAgent(email, password);
      
      // On success, Zustand store will update authentication state
      // and the useEffect above will redirect
      
    } catch (error: any) {
      // Error is set in store's error_message
      // Map specific error codes to user-friendly messages
      const errorMsg = error.message || 'Login failed';
      
      if (errorMsg.includes('not approved') || errorMsg.includes('pending approval')) {
        setValidationErrors({
          credentials: 'Your agent application is pending approval. You will receive an email when approved (typically within 24-48 hours).'
        });
      } else if (errorMsg.includes('suspended')) {
        setValidationErrors({
          credentials: 'Your account has been suspended. Please contact support for assistance.'
        });
      } else if (errorMsg.includes('rejected')) {
        setValidationErrors({
          credentials: 'Your agent application was not approved. Please contact support for more information.'
        });
      } else if (errorMsg.includes('verify')) {
        setValidationErrors({
          credentials: 'Please verify your email address before logging in. Check your inbox for the verification link.'
        });
      } else if (errorMsg.includes('Invalid') || errorMsg.includes('incorrect')) {
        setValidationErrors({
          credentials: 'The email or password you entered is incorrect. Please try again.'
        });
      } else {
        setValidationErrors({
          credentials: errorMsg
        });
      }
    }
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (validationErrors.email) {
      setValidationErrors(prev => ({ ...prev, email: undefined }));
    }
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link 
                to="/" 
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Back to Home</span>
              </Link>
            </div>
          </div>
        </nav>
        
        {/* Main Login Content */}
        <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Card Container */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Agent Sign In
                  </h2>
                  <p className="text-gray-600">
                    Sign in to access your agent dashboard
                  </p>
                </div>
                
                {/* Global Error Message */}
                {(validationErrors.credentials || errorMessage) && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md" role="alert">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 leading-relaxed">
                        {validationErrors.credentials || errorMessage}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {/* Email Field */}
                  <div>
                    <label 
                      htmlFor="email" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="agent@example.com"
                      disabled={isLoading}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${validationErrors.email 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-blue-500'
                        }
                      `}
                    />
                    {validationErrors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {validationErrors.email}
                      </p>
                    )}
                  </div>
                  
                  {/* Password Field */}
                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        className={`
                          w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
                          focus:outline-none focus:ring-4 focus:ring-blue-100
                          disabled:opacity-50 disabled:cursor-not-allowed pr-12
                          ${validationErrors.password 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-gray-200 focus:border-blue-500'
                          }
                        `}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        disabled={isLoading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {validationErrors.password}
                      </p>
                    )}
                  </div>
                  
                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember_me"
                        name="remember_me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50"
                      />
                      <label 
                        htmlFor="remember_me" 
                        className="ml-2 block text-sm text-gray-700 cursor-pointer"
                      >
                        Remember me
                      </label>
                    </div>
                    
                    <Link 
                      to="/forgot-password"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  
                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      w-full flex justify-center items-center
                      px-6 py-3 rounded-lg font-medium
                      text-white bg-blue-600 hover:bg-blue-700
                      shadow-lg hover:shadow-xl
                      transition-all duration-200
                      focus:outline-none focus:ring-4 focus:ring-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                      disabled:hover:bg-blue-600
                    "
                  >
                    {isLoading ? (
                      <>
                        <svg 
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                          fill="none" 
                          viewBox="0 0 24 24"
                        >
                          <circle 
                            className="opacity-25" 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                          />
                          <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              </div>
              
              {/* Divider */}
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-center text-sm text-gray-600">
                  New to PropConnect?{' '}
                  <Link 
                    to="/agent/register"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Register as an Agent
                  </Link>
                </p>
              </div>
            </div>
            
            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Looking for the property seeker login?{' '}
                <Link 
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AgentLogin;