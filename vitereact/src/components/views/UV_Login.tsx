import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

const UV_Login: React.FC = () => {
  // ========== URL PARAMS ==========
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect_url = searchParams.get('redirect_url') || '/account';

  // ========== LOCAL STATE ==========
  const [login_form_data, setLoginFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
    validation_errors: {} as Record<string, string>,
    submitting: false,
    login_error: null as string | null,
  });

  const [show_password, setShowPassword] = useState(false);

  // ========== GLOBAL STATE ACCESS (Individual Selectors) ==========
  const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const is_loading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const current_user = useAppStore(state => state.authentication_state.current_user);
  const global_error_message = useAppStore(state => state.authentication_state.error_message);
  const login_user = useAppStore(state => state.login_user);
  const clear_auth_error = useAppStore(state => state.clear_auth_error);

  // ========== REDIRECT IF ALREADY AUTHENTICATED ==========
  useEffect(() => {
    if (is_authenticated && current_user) {
      navigate(redirect_url, { replace: true });
    }
  }, [is_authenticated, current_user, redirect_url, navigate]);

  // ========== FORM VALIDATION ==========
  const validate_form = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!login_form_data.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login_form_data.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!login_form_data.password) {
      errors.password = 'Password is required';
    }

    setLoginFormData(prev => ({ ...prev, validation_errors: errors }));
    return Object.keys(errors).length === 0;
  };

  // ========== FORM SUBMISSION ==========
  const handle_submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clear_auth_error();
    setLoginFormData(prev => ({ ...prev, login_error: null, validation_errors: {} }));

    // Validate form
    if (!validate_form()) {
      return;
    }

    // Set submitting state
    setLoginFormData(prev => ({ ...prev, submitting: true }));

    try {
      // Call global store login action (handles API call)
      await login_user(login_form_data.email, login_form_data.password);
      
      // Success: Store will update auth state and this component will redirect via useEffect
      // Navigation happens automatically via useEffect watching is_authenticated
      
    } catch (error: any) {
      // Error is set in global state, will be displayed via global_error_message
      setLoginFormData(prev => ({ 
        ...prev, 
        submitting: false,
        password: '' // Clear password on error for security
      }));
    }
  };

  // ========== INPUT HANDLERS ==========
  const handle_email_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginFormData(prev => ({
      ...prev,
      email: e.target.value,
      validation_errors: { ...prev.validation_errors, email: '' }, // Clear error on change
    }));
    clear_auth_error(); // Clear global error
  };

  const handle_password_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginFormData(prev => ({
      ...prev,
      password: e.target.value,
      validation_errors: { ...prev.validation_errors, password: '' },
    }));
    clear_auth_error();
  };

  const handle_remember_me_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginFormData(prev => ({
      ...prev,
      remember_me: e.target.checked,
    }));
  };

  const toggle_password_visibility = () => {
    setShowPassword(prev => !prev);
  };

  // ========== RENDER ==========
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your PropConnect account</p>
            </div>

            {/* Global Error Message */}
            {global_error_message && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4" role="alert" aria-live="polite">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{global_error_message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handle_submit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={login_form_data.email}
                    onChange={handle_email_change}
                    placeholder="your.email@example.com"
                    className={`block w-full pl-11 pr-4 py-3 border-2 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      login_form_data.validation_errors.email
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    disabled={login_form_data.submitting}
                  />
                </div>
                {login_form_data.validation_errors.email && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {login_form_data.validation_errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={show_password ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={login_form_data.password}
                    onChange={handle_password_change}
                    placeholder="Enter your password"
                    className={`block w-full pl-11 pr-12 py-3 border-2 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      login_form_data.validation_errors.password
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    disabled={login_form_data.submitting}
                  />
                  <button
                    type="button"
                    onClick={toggle_password_visibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    aria-label={show_password ? 'Hide password' : 'Show password'}
                    disabled={login_form_data.submitting}
                  >
                    {show_password ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {login_form_data.validation_errors.password && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {login_form_data.validation_errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember_me"
                    name="remember_me"
                    type="checkbox"
                    checked={login_form_data.remember_me}
                    onChange={handle_remember_me_change}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={login_form_data.submitting}
                  />
                  <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={login_form_data.submitting || is_loading}
                className={`w-full flex justify-center items-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  login_form_data.submitting || is_loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
              >
                {login_form_data.submitting || is_loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="mt-6">
              <Link
                to={`/register${redirect_url !== '/account' ? `?redirect_url=${encodeURIComponent(redirect_url)}` : ''}`}
                className="w-full flex justify-center items-center px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create New Account
              </Link>
            </div>

            {/* Agent Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Are you a real estate agent?{' '}
                <Link
                  to="/agent/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Agent Sign In
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;