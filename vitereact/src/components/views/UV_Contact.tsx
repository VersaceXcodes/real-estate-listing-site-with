import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Mail, Phone, MapPin, Send, Upload, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface ContactCategory {
  id: string;
  label: string;
  description: string;
  email: string;
  phone: string | null;
}

interface ContactFormState {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  subject: string;
  category: string;
  message: string;
  attachment_url: string | null;
  validation_errors: Record<string, string>;
  submitting: boolean;
  submit_success: boolean;
  submit_error: string | null;
}

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  upload_progress: number;
  upload_error: string | null;
}

interface FAQItem {
  question: string;
  answer: string;
  expanded: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const submitContactFormAPI = async (data: any, token: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries`,
    data,
    { headers }
  );
  
  return response.data;
};

const uploadDocumentAPI = async (formData: FormData, token: string | null) => {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/upload/document`,
    formData,
    { 
      headers,
      onUploadProgress: (progressEvent) => {
        // Progress tracking handled in component
      }
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Contact: React.FC = () => {
  // ========== GLOBAL STATE (Individual selectors - CRITICAL) ==========
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userAuthToken = useAppStore(state => state.authentication_state.user_auth_token);
  const agentAuthToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const showToast = useAppStore(state => state.show_toast);
  
  // Determine which token to use
  const authToken = userAuthToken || agentAuthToken;
  
  // ========== LOCAL STATE ==========
  
  // Contact categories
  const [categories] = useState<ContactCategory[]>([
    {
      id: 'general',
      label: 'General Inquiry',
      description: 'Questions about using PropConnect or finding properties',
      email: 'support@propconnect.com',
      phone: null,
    },
    {
      id: 'agent_support',
      label: 'Agent Support',
      description: 'Help with listing management and agent features',
      email: 'agent-support@propconnect.com',
      phone: '555-1000',
    },
    {
      id: 'technical',
      label: 'Technical Issues',
      description: 'Bug reports and technical problems',
      email: 'technical@propconnect.com',
      phone: null,
    },
  ]);
  
  // Contact form state
  const [contactForm, setContactForm] = useState<ContactFormState>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    subject: '',
    category: 'general',
    message: '',
    attachment_url: null,
    validation_errors: {},
    submitting: false,
    submit_success: false,
    submit_error: null,
  });
  
  // File upload state
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    uploading: false,
    upload_progress: 0,
    upload_error: null,
  });
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQItem[]>([
    {
      question: 'How do I search for properties?',
      answer: 'Use the search bar on the homepage to enter a location, price range, and property type. You can also use advanced filters to narrow your search by bedrooms, amenities, and more.',
      expanded: false,
    },
    {
      question: 'How do I save properties to my favorites?',
      answer: 'Click the heart icon on any property card. You\'ll need to create a free account to save properties and track them over time.',
      expanded: false,
    },
    {
      question: 'How can I contact an agent about a property?',
      answer: 'On any property detail page, scroll to the contact form and fill in your information. The agent will receive your inquiry and respond via email or phone.',
      expanded: false,
    },
    {
      question: 'How do I list my property as an agent?',
      answer: 'Register as an agent by clicking "Join as an Agent" in the navigation. After approval, you can create listings from your agent dashboard.',
      expanded: false,
    },
    {
      question: 'What is your response time for inquiries?',
      answer: 'We typically respond to general inquiries within 24 hours during business hours (Monday-Friday, 9AM-6PM EST). Property-specific inquiries are forwarded to agents who respond based on their availability.',
      expanded: false,
    },
  ]);
  
  // Selected category object
  const selectedCategory = categories.find(cat => cat.id === contactForm.category) || categories[0];
  
  // ========== EFFECTS ==========
  
  // Pre-fill form if authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setContactForm(prev => ({
        ...prev,
        contact_name: currentUser.full_name || '',
        contact_email: currentUser.email || '',
        contact_phone: currentUser.phone_number || '',
      }));
    }
  }, [isAuthenticated, currentUser]);
  
  // ========== REACT QUERY MUTATIONS ==========
  
  const submitFormMutation = useMutation({
    mutationFn: (payload: any) => submitContactFormAPI(payload, authToken),
    onSuccess: () => {
      setContactForm(prev => ({
        ...prev,
        submitting: false,
        submit_success: true,
        submit_error: null,
      }));
      showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to send message';
      setContactForm(prev => ({
        ...prev,
        submitting: false,
        submit_error: errorMessage,
      }));
      showToast(errorMessage, 'error');
    },
  });
  
  const uploadFileMutation = useMutation({
    mutationFn: (formData: FormData) => uploadDocumentAPI(formData, authToken),
    onSuccess: (response) => {
      setContactForm(prev => ({
        ...prev,
        attachment_url: response.document_url,
      }));
      setFileUpload({
        file: fileUpload.file,
        uploading: false,
        upload_progress: 100,
        upload_error: null,
      });
      showToast('File uploaded successfully', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Upload failed';
      setFileUpload(prev => ({
        ...prev,
        uploading: false,
        upload_error: errorMessage,
      }));
      showToast(errorMessage, 'error');
    },
  });
  
  // ========== HANDLERS ==========
  
  const handleInputChange = (field: keyof ContactFormState, value: string) => {
    setContactForm(prev => {
      const newErrors = { ...prev.validation_errors };
      delete newErrors[field]; // Clear error when user types
      return {
        ...prev,
        [field]: value,
        validation_errors: newErrors,
      };
    });
  };
  
  const handleCategoryChange = (categoryId: string) => {
    setContactForm(prev => ({
      ...prev,
      category: categoryId,
      validation_errors: {},
    }));
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if (file.size > maxSize) {
      setFileUpload(prev => ({
        ...prev,
        upload_error: 'File size must be less than 10MB',
      }));
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setFileUpload(prev => ({
        ...prev,
        upload_error: 'File must be PDF, JPG, or PNG',
      }));
      return;
    }
    
    // Start upload
    setFileUpload({
      file,
      uploading: true,
      upload_progress: 0,
      upload_error: null,
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', contactForm.category);
    
    uploadFileMutation.mutate(formData);
  };
  
  const handleRemoveFile = () => {
    setFileUpload({
      file: null,
      uploading: false,
      upload_progress: 0,
      upload_error: null,
    });
    setContactForm(prev => ({
      ...prev,
      attachment_url: null,
    }));
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!contactForm.contact_name.trim()) {
      errors.contact_name = 'Name is required';
    }
    
    if (!contactForm.contact_email.trim()) {
      errors.contact_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.contact_email)) {
      errors.contact_email = 'Please enter a valid email address';
    }
    
    if (!contactForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    
    if (!contactForm.message.trim()) {
      errors.message = 'Message is required';
    } else if (contactForm.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setContactForm(prev => ({
        ...prev,
        validation_errors: errors,
      }));
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Focus first error field
      const firstErrorField = Object.keys(contactForm.validation_errors)[0];
      document.querySelector<HTMLInputElement>(`[name="${firstErrorField}"]`)?.focus();
      return;
    }
    
    setContactForm(prev => ({
      ...prev,
      submitting: true,
      submit_error: null,
      validation_errors: {},
    }));
    
    // Transform to inquiry format
    const payload = {
      property_id: null,
      agent_id: null,
      user_id: currentUser?.user_id || null,
      inquirer_name: contactForm.contact_name,
      inquirer_email: contactForm.contact_email,
      inquirer_phone: contactForm.contact_phone || null,
      message: `Subject: ${contactForm.subject}\nCategory: ${selectedCategory.label}\n\nMessage:\n${contactForm.message}${contactForm.attachment_url ? `\n\nAttachment: ${contactForm.attachment_url}` : ''}`,
      viewing_requested: false,
      preferred_viewing_date: null,
      preferred_viewing_time: null,
    };
    
    submitFormMutation.mutate(payload);
  };
  
  const handleSendAnother = () => {
    setContactForm({
      contact_name: currentUser?.full_name || '',
      contact_email: currentUser?.email || '',
      contact_phone: currentUser?.phone_number || '',
      subject: '',
      category: 'general',
      message: '',
      attachment_url: null,
      validation_errors: {},
      submitting: false,
      submit_success: false,
      submit_error: null,
    });
    setFileUpload({
      file: null,
      uploading: false,
      upload_progress: 0,
      upload_error: null,
    });
  };
  
  const toggleFAQ = (index: number) => {
    setFaqs(prev => prev.map((faq, i) => 
      i === index ? { ...faq, expanded: !faq.expanded } : faq
    ));
  };
  
  // ========== RENDER ==========
  
  return (
    <>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Have questions? We're here to help. Contact our support team or reach out directly using the information below.
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        
        {/* Contact Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How Can We Help?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${
                  contactForm.category === category.id
                    ? 'border-blue-600 shadow-lg'
                    : 'border-gray-200 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.label}
                  </h3>
                  {contactForm.category === category.id && (
                    <div className="bg-blue-600 rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {category.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    <a 
                      href={`mailto:${category.email}`}
                      className="hover:text-blue-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {category.email}
                    </a>
                  </div>
                  {category.phone && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone className="w-4 h-4 mr-2 text-blue-600" />
                      <a 
                        href={`tel:${category.phone}`}
                        className="hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {category.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Contact Form (Left - 2 columns) */}
          <div className="lg:col-span-2">
            {!contactForm.submit_success ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Send Us a Message
                  </h2>
                  <p className="text-sm text-gray-600">
                    Fill out the form below and we'll get back to you within 24 hours during business hours.
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Name Field */}
                  <div>
                    <label htmlFor="contact_name" className="block text-sm font-medium text-gray-900 mb-2">
                      Your Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="contact_name"
                      name="contact_name"
                      value={contactForm.contact_name}
                      onChange={(e) => handleInputChange('contact_name', e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        contactForm.validation_errors.contact_name
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } focus:outline-none`}
                    />
                    {contactForm.validation_errors.contact_name && (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {contactForm.validation_errors.contact_name}
                      </p>
                    )}
                  </div>
                  
                  {/* Email Field */}
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-900 mb-2">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="contact_email"
                      name="contact_email"
                      value={contactForm.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="your.email@example.com"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        contactForm.validation_errors.contact_email
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } focus:outline-none`}
                    />
                    {contactForm.validation_errors.contact_email && (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {contactForm.validation_errors.contact_email}
                      </p>
                    )}
                  </div>
                  
                  {/* Phone Field */}
                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="contact_phone"
                      name="contact_phone"
                      value={contactForm.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="(123) 456-7890"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-200"
                    />
                  </div>
                  
                  {/* Subject Field */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-900 mb-2">
                      Subject <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={contactForm.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Brief description of your inquiry"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        contactForm.validation_errors.subject
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } focus:outline-none`}
                    />
                    {contactForm.validation_errors.subject && (
                      <p className="mt-2 text-sm text-red-600" role="alert">
                        {contactForm.validation_errors.subject}
                      </p>
                    )}
                  </div>
                  
                  {/* Category Display (Read-only, controlled by cards above) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Category
                    </label>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <p className="text-gray-900 font-medium">
                        {selectedCategory.label}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your message will be routed to: {selectedCategory.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Message Field */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                      Message <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={contactForm.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Please provide details about your inquiry..."
                      maxLength={2000}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 resize-none ${
                        contactForm.validation_errors.message
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } focus:outline-none`}
                    />
                    <div className="flex justify-between items-center mt-2">
                      {contactForm.validation_errors.message && (
                        <p className="text-sm text-red-600" role="alert">
                          {contactForm.validation_errors.message}
                        </p>
                      )}
                      <p className={`text-sm ml-auto ${
                        contactForm.message.length > 1900 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {contactForm.message.length} / 2000
                      </p>
                    </div>
                  </div>
                  
                  {/* File Attachment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Attachment (Optional)
                    </label>
                    
                    {!fileUpload.file && !contactForm.attachment_url ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Upload a file (PDF, JPG, PNG)
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Maximum file size: 10MB
                        </p>
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-lg cursor-pointer transition-colors"
                        >
                          Choose File
                        </label>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="bg-blue-100 rounded-lg p-2 mr-3">
                              <Upload className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {fileUpload.file?.name || 'Uploaded file'}
                              </p>
                              {fileUpload.uploading ? (
                                <div className="mt-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${fileUpload.upload_progress}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Uploading... {fileUpload.upload_progress}%
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Upload complete
                                </p>
                              )}
                            </div>
                          </div>
                          {!fileUpload.uploading && (
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              className="ml-3 text-gray-400 hover:text-red-600 transition-colors"
                              aria-label="Remove file"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        {fileUpload.upload_error && (
                          <p className="mt-2 text-sm text-red-600" role="alert">
                            {fileUpload.upload_error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={contactForm.submitting || fileUpload.uploading}
                      className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {contactForm.submitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      By submitting, you agree to our{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                    </p>
                  </div>
                  
                </form>
              </div>
            ) : (
              // Success State
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Message Sent Successfully!
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Thank you for contacting us. We've received your message and will respond within 24 hours during business hours.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                      Need immediate assistance?
                    </h3>
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex items-center justify-center">
                        <Mail className="w-4 h-4 mr-2" />
                        <a href={`mailto:${selectedCategory.email}`} className="hover:text-blue-900">
                          {selectedCategory.email}
                        </a>
                      </div>
                      {selectedCategory.phone && (
                        <div className="flex items-center justify-center">
                          <Phone className="w-4 h-4 mr-2" />
                          <a href={`tel:${selectedCategory.phone}`} className="hover:text-blue-900">
                            {selectedCategory.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSendAnother}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg border border-gray-300 transition-all duration-200"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Contact Information Sidebar (Right - 1 column) */}
          <div className="space-y-6">
            
            {/* Office Information Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Contact Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <a 
                      href="mailto:support@propconnect.com"
                      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      support@propconnect.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <a 
                      href="tel:555-776-7266"
                      className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      555-PROPCONNECT
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Office</p>
                    <p className="text-sm text-gray-600">
                      123 Business Avenue<br />
                      Miami, FL 33139
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Business Hours Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Business Hours
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Monday - Friday</span>
                  <span className="text-gray-900 font-medium">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Saturday</span>
                  <span className="text-gray-900 font-medium">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Sunday</span>
                  <span className="text-gray-900 font-medium">Closed</span>
                </div>
                <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-blue-200">
                  All times displayed in Eastern Standard Time (EST)
                </p>
              </div>
            </div>
            
            {/* Quick Links Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Links
              </h3>
              <div className="space-y-2">
                <Link 
                  to="/search"
                  className="block text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  → Search Properties
                </Link>
                <Link 
                  to="/agent/register"
                  className="block text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  → Register as Agent
                </Link>
                <Link 
                  to="/terms"
                  className="block text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  → Terms of Service
                </Link>
                <Link 
                  to="/privacy"
                  className="block text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  → Privacy Policy
                </Link>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16 lg:mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Find quick answers to common questions. Can't find what you're looking for? Use the contact form above.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-base font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {faq.expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                
                {faq.expanded && (
                  <div className="px-6 pb-4 pt-2">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">
              Still have questions?
            </p>
            <a
              href="#contact-form"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Contact Support
            </a>
          </div>
        </div>
        
      </div>
    </>
  );
};

export default UV_Contact;