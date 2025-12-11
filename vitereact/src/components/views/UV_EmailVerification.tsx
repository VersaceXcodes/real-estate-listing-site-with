import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { CheckCircle, XCircle, AlertCircle, Mail, Loader2 } from 'lucide-react';

const UV_EmailVerification: React.FC = () => {
  // URL parameter extraction
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Local state matching datamap specification
  const [is_verifying, setIsVerifying] = useState<boolean>(true);
  const [verification_success, setVerificationSuccess] = useState<boolean>(false);
  const [verification_error, setVerificationError] = useState<string | null>(null);
  const [can_resend, setCanResend] = useState<boolean>(false);
  const [redirect_countdown, setRedirectCountdown] = useState<number>(3);
  
  // Global state access - CRITICAL: Individual selectors only
  const verifyEmail = useAppStore(state => state.verify_email);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const showToast = useAppStore(state => state.show_toast);
  
  // Extract token from URL and verify on mount
  useEffect(() => {
    const urlToken = searchParams.get('token');
    
    if (!urlToken) {
      // No token in URL - invalid link
      setIsVerifying(false);
      setVerificationError('Invalid verification link. Please check your email or request a new verification link.');
      setCanResend(true);
      return;
    }
    
    // Call verification function from global store
    const performVerification = async () => {
      setIsVerifying(true);
      setVerificationError(null);
      
      try {
        // Global store's verify_email handles API call to POST /api/auth/verify-email
        await verifyEmail(urlToken);
        
        // Success - store already shows toast
        setVerificationSuccess(true);
        setIsVerifying(false);
        
      } catch (error: any) {
        // Verification failed
        setIsVerifying(false);
        
        const errorMsg = error.message || 'Email verification failed. The link may be invalid or expired.';
        setVerificationError(errorMsg);
        
        // Enable resend if token is expired
        if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid')) {
          setCanResend(true);
        }
      }
    };
    
    performVerification();
  }, [searchParams, verifyEmail]);
  
  // Auto-redirect countdown after successful verification
  useEffect(() => {
    if (verification_success) {
      const countdown_interval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdown_interval);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdown_interval);
    }
  }, [verification_success, navigate]);
  
  // Handle resend verification (placeholder - endpoint not implemented yet)
  const handleResendVerification = () => {
    // NOTE: Backend endpoint POST /api/auth/resend-verification not yet implemented
    // Would need user's email address to resend
    
    showToast(
      'Resend verification feature coming soon. Please contact support for assistance.',
      'info',
      5000
    );
    
    // Future implementation:
    // const email = currentUser?.email || prompt('Enter your email address:');
    // await resendVerificationEmail(email);
  };
  
  const handleGoToHomepage = () => {
    navigate('/');
  };
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  const handleGoToRegister = () => {
    navigate('/register');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Main verification card */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-xl border border-gray-100 p-8 text-center">
            
            {/* Loading State */}
            {is_verifying && (
              <>
                <div className="flex justify-center mb-6">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Your Email
                </h1>
                
                <p className="text-gray-600 leading-relaxed">
                  Please wait while we verify your email address...
                </p>
              </>
            )}
            
            {/* Success State */}
            {!is_verifying && verification_success && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="w-16 h-16 text-green-600" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Email Verified Successfully!
                </h1>
                
                <p className="text-gray-600 leading-relaxed mb-6">
                  {isAuthenticated 
                    ? `Welcome to PropConnect, ${currentUser?.full_name || 'there'}! Your account is now active.`
                    : 'Your email has been verified. You can now sign in to your account.'
                  }
                </p>
                
                {isAuthenticated ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-700 text-sm">
                        You will be redirected to the homepage in <strong>{redirect_countdown}</strong> second{redirect_countdown !== 1 ? 's' : ''}...
                      </p>
                    </div>
                    
                    <button
                      onClick={handleGoToHomepage}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      Continue to Homepage
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleGoToLogin}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      Sign In to Your Account
                    </button>
                    
                    <button
                      onClick={handleGoToHomepage}
                      className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                    >
                      Browse Properties
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* Error State */}
            {!is_verifying && verification_error && (
              <>
                <div className="flex justify-center mb-6">
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="w-16 h-16 text-red-600" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Verification Failed
                </h1>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700 text-sm leading-relaxed">
                    {verification_error}
                  </p>
                </div>
                
                <div className="text-left space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Verification links expire after 24 hours for security
                    </p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Check your email inbox for the most recent verification link
                    </p>
                  </div>
                </div>
                
                {can_resend && (
                  <button
                    onClick={handleResendVerification}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100 mb-3"
                  >
                    Request New Verification Email
                  </button>
                )}
                
                <div className="space-y-2">
                  <button
                    onClick={handleGoToLogin}
                    className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                  >
                    Sign In
                  </button>
                  
                  <button
                    onClick={handleGoToRegister}
                    className="w-full text-blue-600 hover:text-blue-700 px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    Create New Account
                  </button>
                </div>
              </>
            )}
            
          </div>
          
          {/* Additional help text */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Need help?{' '}
              <Link 
                to="/"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Back to Homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_EmailVerification;