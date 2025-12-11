import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Upload, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const UV_AgentRegister: React.FC = () => {
  const navigate = useNavigate();
  
  // Individual Zustand selectors
  const registerAgent = useAppStore(state => state.register_agent);
  const authLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const authError = useAppStore(state => state.authentication_state.error_message);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  
  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Account Information
  const [step1Data, setStep1Data] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    phone_number: '',
    validation_errors: {} as Record<string, string>
  });
  
  // Step 2: Professional Information
  const [step2Data, setStep2Data] = useState({
    license_number: '',
    license_state: '',
    agency_name: '',
    office_address_street: '',
    office_address_city: '',
    office_address_state: '',
    office_address_zip: '',
    years_experience: '',
    license_document_file: null as File | null,
    license_document_url: '',
    validation_errors: {} as Record<string, string>,
    uploading: false,
    upload_error: null as string | null
  });
  
  // Step 3: Profile Setup
  const [step3Data, setStep3Data] = useState({
    profile_photo_file: null as File | null,
    profile_photo_url: '',
    bio: '',
    specializations: [] as string[],
    service_areas: [] as string[],
    languages_spoken: [] as string[],
    terms_accepted: false,
    validation_errors: {} as Record<string, string>,
    uploading_photo: false,
    photo_upload_error: null as string | null
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  // File upload states
  const [licenseUploadProgress, setLicenseUploadProgress] = useState(0);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);

  // Password strength calculation
  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!step1Data.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1Data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!step1Data.password) {
      errors.password = 'Password is required';
    } else if (step1Data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (step1Data.password !== step1Data.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    if (!step1Data.full_name || step1Data.full_name.trim().length === 0) {
      errors.full_name = 'Full name is required';
    }
    
    if (!step1Data.phone_number) {
      errors.phone_number = 'Phone number is required';
    }
    
    setStep1Data(prev => ({ ...prev, validation_errors: errors }));
    return Object.keys(errors).length === 0;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!step2Data.license_number) {
      errors.license_number = 'License number is required';
    }
    
    if (!step2Data.license_state) {
      errors.license_state = 'License state is required';
    }
    
    if (!step2Data.agency_name) {
      errors.agency_name = 'Agency name is required';
    }
    
    if (!step2Data.office_address_street) {
      errors.office_address_street = 'Office street address is required';
    }
    
    if (!step2Data.office_address_city) {
      errors.office_address_city = 'City is required';
    }
    
    if (!step2Data.office_address_state) {
      errors.office_address_state = 'State is required';
    } else if (step2Data.office_address_state.length !== 2) {
      errors.office_address_state = 'State must be 2 characters (e.g., CA)';
    }
    
    if (!step2Data.office_address_zip) {
      errors.office_address_zip = 'ZIP code is required';
    } else if (step2Data.office_address_zip.length < 5) {
      errors.office_address_zip = 'ZIP code must be at least 5 characters';
    }
    
    if (!step2Data.years_experience) {
      errors.years_experience = 'Years of experience is required';
    }
    
    if (!step2Data.license_document_url && !step2Data.license_document_file) {
      errors.license_document = 'Please upload your license documentation';
    }
    
    setStep2Data(prev => ({ ...prev, validation_errors: errors }));
    return Object.keys(errors).length === 0;
  };

  // Step 3 validation
  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!step3Data.terms_accepted) {
      errors.terms_accepted = 'You must agree to the Terms of Service and Commission Agreement';
    }
    
    setStep3Data(prev => ({ ...prev, validation_errors: errors }));
    return Object.keys(errors).length === 0;
  };

  // Upload license document
  const handleLicenseUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setStep2Data(prev => ({ ...prev, upload_error: 'File size must be less than 10MB' }));
      return;
    }
    
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setStep2Data(prev => ({ ...prev, upload_error: 'File must be PDF, JPG, or PNG' }));
      return;
    }
    
    setStep2Data(prev => ({ 
      ...prev, 
      license_document_file: file,
      uploading: true, 
      upload_error: null 
    }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'license');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/upload/document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentage = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setLicenseUploadProgress(percentage);
          }
        }
      );
      
      setStep2Data(prev => ({ 
        ...prev, 
        license_document_url: response.data.document_url || response.data.url,
        uploading: false 
      }));
      
    } catch (error: any) {
      setStep2Data(prev => ({ 
        ...prev, 
        uploading: false, 
        upload_error: error.response?.data?.error?.message || 'Upload failed. Please try again.' 
      }));
    }
  };

  // Upload profile photo
  const handlePhotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setStep3Data(prev => ({ ...prev, photo_upload_error: 'Image must be less than 5MB' }));
      return;
    }
    
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setStep3Data(prev => ({ ...prev, photo_upload_error: 'File must be JPG or PNG' }));
      return;
    }
    
    setStep3Data(prev => ({ 
      ...prev, 
      profile_photo_file: file,
      uploading_photo: true, 
      photo_upload_error: null 
    }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('photo_type', 'profile');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/upload/photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentage = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setPhotoUploadProgress(percentage);
          }
        }
      );
      
      setStep3Data(prev => ({ 
        ...prev, 
        profile_photo_url: response.data.photo_url || response.data.image_url,
        uploading_photo: false 
      }));
      
    } catch (error: any) {
      setStep3Data(prev => ({ 
        ...prev, 
        uploading_photo: false, 
        photo_upload_error: error.response?.data?.error?.message || 'Upload failed. Please try again.' 
      }));
    }
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit complete registration
  const handleSubmit = async () => {
    if (!validateStep3()) {
      return;
    }
    
    clearAuthError();
    
    const registrationData = {
      // Step 1
      email: step1Data.email,
      password: step1Data.password,
      full_name: step1Data.full_name,
      phone_number: step1Data.phone_number,
      
      // Step 2
      license_number: step2Data.license_number,
      license_state: step2Data.license_state,
      agency_name: step2Data.agency_name,
      office_address_street: step2Data.office_address_street,
      office_address_city: step2Data.office_address_city,
      office_address_state: step2Data.office_address_state,
      office_address_zip: step2Data.office_address_zip,
      years_experience: step2Data.years_experience,
      license_document_url: step2Data.license_document_url || null,
      
      // Step 3
      profile_photo_url: step3Data.profile_photo_url || null,
      bio: step3Data.bio || null,
      specializations: step3Data.specializations.length > 0 ? step3Data.specializations : null,
      service_areas: step3Data.service_areas.length > 0 ? step3Data.service_areas : null,
      languages_spoken: step3Data.languages_spoken.length > 0 ? step3Data.languages_spoken : null
    };
    
    try {
      await registerAgent(registrationData);
      
      // On success, navigate to confirmation page
      navigate('/agent/application-submitted', { 
        state: { email: step1Data.email } 
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      // Error is displayed via authError state
    }
  };

  // Toggle specialization
  const toggleSpecialization = (spec: string) => {
    setStep3Data(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  // Add service area
  const addServiceArea = (area: string) => {
    if (area.trim() && !step3Data.service_areas.includes(area.trim())) {
      setStep3Data(prev => ({
        ...prev,
        service_areas: [...prev.service_areas, area.trim()]
      }));
    }
  };

  // Remove service area
  const removeServiceArea = (area: string) => {
    setStep3Data(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter(a => a !== area)
    }));
  };

  // Toggle language
  const toggleLanguage = (lang: string) => {
    setStep3Data(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.includes(lang)
        ? prev.languages_spoken.filter(l => l !== lang)
        : [...prev.languages_spoken, lang]
    }));
  };

  const [newServiceArea, setNewServiceArea] = useState('');

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Join PropConnect as an Agent</h1>
            <p className="text-lg text-gray-600">List your properties and reach more clients</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">Account</span>
              </div>
              
              <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">Professional</span>
              </div>
              
              <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">Profile</span>
              </div>
            </div>
            <p className="text-center mt-2 text-sm text-gray-500">Step {currentStep} of 3</p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-8">
              {/* Global error message */}
              {authError && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <p className="text-sm text-red-700">{authError}</p>
                </div>
              )}

              {/* Step 1: Account Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
                  
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={step1Data.full_name}
                      onChange={(e) => {
                        setStep1Data(prev => ({ 
                          ...prev, 
                          full_name: e.target.value,
                          validation_errors: { ...prev.validation_errors, full_name: '' }
                        }));
                      }}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        step1Data.validation_errors.full_name
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {step1Data.validation_errors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{step1Data.validation_errors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={step1Data.email}
                      onChange={(e) => {
                        setStep1Data(prev => ({ 
                          ...prev, 
                          email: e.target.value,
                          validation_errors: { ...prev.validation_errors, email: '' }
                        }));
                      }}
                      placeholder="your.email@example.com"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        step1Data.validation_errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {step1Data.validation_errors.email && (
                      <p className="mt-1 text-sm text-red-600">{step1Data.validation_errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={step1Data.phone_number}
                      onChange={(e) => {
                        setStep1Data(prev => ({ 
                          ...prev, 
                          phone_number: e.target.value,
                          validation_errors: { ...prev.validation_errors, phone_number: '' }
                        }));
                      }}
                      placeholder="(123) 456-7890"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        step1Data.validation_errors.phone_number
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {step1Data.validation_errors.phone_number && (
                      <p className="mt-1 text-sm text-red-600">{step1Data.validation_errors.phone_number}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={step1Data.password}
                        onChange={(e) => {
                          const newPassword = e.target.value;
                          setStep1Data(prev => ({ 
                            ...prev, 
                            password: newPassword,
                            validation_errors: { ...prev.validation_errors, password: '' }
                          }));
                          setPasswordStrength(calculatePasswordStrength(newPassword));
                        }}
                        placeholder="Create a password"
                        className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                          step1Data.validation_errors.password
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {step1Data.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-1 flex-1 rounded ${
                            passwordStrength === 'weak' ? 'bg-red-500' :
                            passwordStrength === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
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
                      </div>
                    )}
                    {step1Data.validation_errors.password && (
                      <p className="mt-1 text-sm text-red-600">{step1Data.validation_errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        id="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={step1Data.confirm_password}
                        onChange={(e) => {
                          setStep1Data(prev => ({ 
                            ...prev, 
                            confirm_password: e.target.value,
                            validation_errors: { ...prev.validation_errors, confirm_password: '' }
                          }));
                        }}
                        placeholder="Confirm your password"
                        className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                          step1Data.validation_errors.confirm_password
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {step1Data.validation_errors.confirm_password && (
                      <p className="mt-1 text-sm text-red-600">{step1Data.validation_errors.confirm_password}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Professional Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Professional Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Real Estate License Number *
                      </label>
                      <input
                        id="license_number"
                        type="text"
                        value={step2Data.license_number}
                        onChange={(e) => {
                          setStep2Data(prev => ({ 
                            ...prev, 
                            license_number: e.target.value,
                            validation_errors: { ...prev.validation_errors, license_number: '' }
                          }));
                        }}
                        placeholder="e.g., CA-DRE-12345678"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          step2Data.validation_errors.license_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {step2Data.validation_errors.license_number && (
                        <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.license_number}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="license_state" className="block text-sm font-medium text-gray-700 mb-2">
                        License State *
                      </label>
                      <select
                        id="license_state"
                        value={step2Data.license_state}
                        onChange={(e) => {
                          setStep2Data(prev => ({ 
                            ...prev, 
                            license_state: e.target.value,
                            validation_errors: { ...prev.validation_errors, license_state: '' }
                          }));
                        }}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          step2Data.validation_errors.license_state
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      >
                        <option value="">Select state...</option>
                        <option value="AL">Alabama</option>
                        <option value="AK">Alaska</option>
                        <option value="AZ">Arizona</option>
                        <option value="CA">California</option>
                        <option value="FL">Florida</option>
                        <option value="NY">New York</option>
                        <option value="TX">Texas</option>
                      </select>
                      {step2Data.validation_errors.license_state && (
                        <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.license_state}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="agency_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Agency/Brokerage Name *
                    </label>
                    <input
                      id="agency_name"
                      type="text"
                      value={step2Data.agency_name}
                      onChange={(e) => {
                        setStep2Data(prev => ({ 
                          ...prev, 
                          agency_name: e.target.value,
                          validation_errors: { ...prev.validation_errors, agency_name: '' }
                        }));
                      }}
                      placeholder="e.g., Premier Realty Group"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        step2Data.validation_errors.agency_name
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {step2Data.validation_errors.agency_name && (
                      <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.agency_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Address *
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={step2Data.office_address_street}
                        onChange={(e) => {
                          setStep2Data(prev => ({ 
                            ...prev, 
                            office_address_street: e.target.value,
                            validation_errors: { ...prev.validation_errors, office_address_street: '' }
                          }));
                        }}
                        placeholder="Street address"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          step2Data.validation_errors.office_address_street
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {step2Data.validation_errors.office_address_street && (
                        <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.office_address_street}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={step2Data.office_address_city}
                            onChange={(e) => {
                              setStep2Data(prev => ({ 
                                ...prev, 
                                office_address_city: e.target.value,
                                validation_errors: { ...prev.validation_errors, office_address_city: '' }
                              }));
                            }}
                            placeholder="City"
                            className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                              step2Data.validation_errors.office_address_city
                                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                            }`}
                          />
                          {step2Data.validation_errors.office_address_city && (
                            <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.office_address_city}</p>
                          )}
                        </div>
                        <div>
                          <input
                            type="text"
                            value={step2Data.office_address_state}
                            onChange={(e) => {
                              setStep2Data(prev => ({ 
                                ...prev, 
                                office_address_state: e.target.value.toUpperCase().slice(0, 2),
                                validation_errors: { ...prev.validation_errors, office_address_state: '' }
                              }));
                            }}
                            placeholder="State (e.g., CA)"
                            maxLength={2}
                            className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                              step2Data.validation_errors.office_address_state
                                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                            }`}
                          />
                          {step2Data.validation_errors.office_address_state && (
                            <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.office_address_state}</p>
                          )}
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        value={step2Data.office_address_zip}
                        onChange={(e) => {
                          setStep2Data(prev => ({ 
                            ...prev, 
                            office_address_zip: e.target.value,
                            validation_errors: { ...prev.validation_errors, office_address_zip: '' }
                          }));
                        }}
                        placeholder="ZIP code"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          step2Data.validation_errors.office_address_zip
                            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        }`}
                      />
                      {step2Data.validation_errors.office_address_zip && (
                        <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.office_address_zip}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience *
                    </label>
                    <select
                      id="years_experience"
                      value={step2Data.years_experience}
                      onChange={(e) => {
                        setStep2Data(prev => ({ 
                          ...prev, 
                          years_experience: e.target.value,
                          validation_errors: { ...prev.validation_errors, years_experience: '' }
                        }));
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        step2Data.validation_errors.years_experience
                          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    >
                      <option value="">Select experience...</option>
                      <option value="Less than 1">Less than 1 year</option>
                      <option value="1-2">1-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="11-15">11-15 years</option>
                      <option value="16-20">16-20 years</option>
                      <option value="20+">20+ years</option>
                    </select>
                    {step2Data.validation_errors.years_experience && (
                      <p className="mt-1 text-sm text-red-600">{step2Data.validation_errors.years_experience}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Documentation *
                    </label>
                    <p className="text-sm text-gray-500 mb-3">Upload a clear photo or scan of your license</p>
                    
                    {!step2Data.license_document_file && !step2Data.license_document_url ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          id="license_upload"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleLicenseUpload(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label htmlFor="license_upload" className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm font-medium text-gray-700">Click to upload</p>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max 10MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-green-100 rounded-lg p-2">
                              <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {step2Data.license_document_file?.name || 'License document uploaded'}
                              </p>
                              {step2Data.uploading && (
                                <div className="mt-1">
                                  <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-600 transition-all duration-300"
                                      style={{ width: `${licenseUploadProgress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{licenseUploadProgress}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStep2Data(prev => ({ 
                                ...prev, 
                                license_document_file: null,
                                license_document_url: ''
                              }));
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    {step2Data.upload_error && (
                      <p className="mt-2 text-sm text-red-600">{step2Data.upload_error}</p>
                    )}
                    {step2Data.validation_errors.license_document && (
                      <p className="mt-2 text-sm text-red-600">{step2Data.validation_errors.license_document}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Profile Setup */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Setup</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo (Optional)
                    </label>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex-shrink-0">
                        {step3Data.profile_photo_url || step3Data.profile_photo_file ? (
                          <img
                            src={step3Data.profile_photo_url || (step3Data.profile_photo_file ? URL.createObjectURL(step3Data.profile_photo_file) : '')}
                            alt="Profile preview"
                            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <input
                          type="file"
                          id="photo_upload"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoUpload(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="photo_upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </label>
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG (max 5MB)</p>
                        
                        {step3Data.uploading_photo && (
                          <div className="mt-2">
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${photoUploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {step3Data.photo_upload_error && (
                          <p className="mt-2 text-sm text-red-600">{step3Data.photo_upload_error}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Bio (Optional)
                    </label>
                    <textarea
                      id="bio"
                      value={step3Data.bio}
                      onChange={(e) => {
                        setStep3Data(prev => ({ ...prev, bio: e.target.value }));
                      }}
                      placeholder="Tell clients about your experience and expertise..."
                      rows={5}
                      maxLength={2000}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">{step3Data.bio.length} / 2000 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Specializations (Optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Residential Sales', 'Residential Rentals', 'Commercial Properties', 'Luxury Properties', 'First-Time Buyers', 'Investment Properties'].map(spec => (
                        <label key={spec} className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={step3Data.specializations.includes(spec)}
                            onChange={() => toggleSpecialization(spec)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{spec}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Areas (Optional)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newServiceArea}
                        onChange={(e) => setNewServiceArea(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newServiceArea.trim()) {
                              addServiceArea(newServiceArea);
                              setNewServiceArea('');
                            }
                          }
                        }}
                        placeholder="e.g., Miami, Coral Gables"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newServiceArea.trim()) {
                            addServiceArea(newServiceArea);
                            setNewServiceArea('');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    {step3Data.service_areas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {step3Data.service_areas.map(area => (
                          <span 
                            key={area}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                          >
                            {area}
                            <button
                              type="button"
                              onClick={() => removeServiceArea(area)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Languages Spoken (Optional)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['English', 'Spanish', 'French', 'Mandarin', 'Cantonese', 'Portuguese'].map(lang => (
                        <label key={lang} className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={step3Data.languages_spoken.includes(lang)}
                            onChange={() => toggleLanguage(lang)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{lang}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step3Data.terms_accepted}
                        onChange={(e) => {
                          setStep3Data(prev => ({ 
                            ...prev, 
                            terms_accepted: e.target.checked,
                            validation_errors: { ...prev.validation_errors, terms_accepted: '' }
                          }));
                        }}
                        className={`w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                          step3Data.validation_errors.terms_accepted ? 'border-red-300' : ''
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
                          Agent Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
                          Commission Agreement
                        </Link>
                      </span>
                    </label>
                    {step3Data.validation_errors.terms_accepted && (
                      <p className="mt-2 text-sm text-red-600">{step3Data.validation_errors.terms_accepted}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="inline-flex items-center px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={authLoading || step2Data.uploading || step3Data.uploading_photo}
                      className="inline-flex items-center px-8 py-3 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Already have account link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/agent/login" 
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AgentRegister;