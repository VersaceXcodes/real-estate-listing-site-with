import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Building2, Phone, Mail, MapPin, Award, Languages, Briefcase, CheckCircle2, Home, DollarSign, Bed, Bath, Maximize } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AgentProfileData {
  agent_id: string;
  email: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  license_state: string;
  agency_name: string;
  office_address_street: string;
  office_address_city: string;
  office_address_state: string;
  office_address_zip: string;
  years_experience: string;
  profile_photo_url: string | null;
  professional_title: string | null;
  bio: string | null;
  specializations: string[] | null;
  service_areas: string[] | null;
  languages_spoken: string[] | null;
  social_media_links: Record<string, string> | null;
  certifications: string[] | null;
  approved: boolean;
  account_status: 'active' | 'inactive' | 'suspended';
}

interface Property {
  property_id: string;
  title: string;
  price: string | number;
  currency: string;
  address_street: string;
  address_city: string;
  address_state: string;
  property_type: string;
  listing_type: 'sale' | 'rent';
  bedrooms: string | number;
  bathrooms: string | number;
  square_footage: string | number;
  status: string;
  primary_photo: {
    image_url: string;
    thumbnail_url: string | null;
  } | null;
}

interface PropertiesResponse {
  data: Property[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface InquiryPayload {
  property_id: null;
  agent_id: string;
  user_id: string | null;
  inquirer_name: string;
  inquirer_email: string;
  inquirer_phone: string;
  message: string;
  viewing_requested: boolean;
}

interface InquiryResponse {
  inquiry_id: string;
  status: string;
  created_at: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchAgentProfile = async (agent_id: string): Promise<AgentProfileData> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agent_id}`
  );
  
  // Verify agent is approved and active
  if (!response.data.approved || response.data.account_status !== 'active') {
    throw new Error('Agent profile not available');
  }
  
  return response.data;
};

const fetchAgentListings = async (agent_id: string, listing_type?: 'sale' | 'rent'): Promise<PropertiesResponse> => {
  const params: any = {
    agent_id,
    status: 'active',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 100
  };
  
  if (listing_type) {
    params.listing_type = listing_type;
  }
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
    { params }
  );
  
  return response.data;
};

const submitGeneralInquiry = async (payload: InquiryPayload): Promise<InquiryResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AgentProfile: React.FC = () => {
  const { agent_id } = useParams<{ agent_id: string }>();
  const navigate = useNavigate();
  
  // Global state - Individual selectors (CRITICAL)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  // Local state
  const [listingFilter, setListingFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [contactFormData, setContactFormData] = useState({
    name: currentUser?.full_name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone_number || '',
    subject: 'General Inquiry',
    message: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // React Query - Agent profile
  const { 
    data: agentProfile, 
    isLoading: profileLoading, 
    error: profileError 
  } = useQuery({
    queryKey: ['agent-profile', agent_id],
    queryFn: () => fetchAgentProfile(agent_id!),
    enabled: !!agent_id,
    retry: 1,
    staleTime: 60000
  });
  
  // React Query - Agent listings
  const filterType = listingFilter === 'all' ? undefined : listingFilter;
  const { 
    data: listingsResponse, 
    isLoading: listingsLoading 
  } = useQuery({
    queryKey: ['agent-listings', agent_id, filterType],
    queryFn: () => fetchAgentListings(agent_id!, filterType),
    enabled: !!agent_id && !!agentProfile,
    retry: 1,
    staleTime: 30000,
    select: (data) => ({
      ...data,
      data: data.data.map(item => ({
        ...item,
        price: Number(item.price || 0),
        bedrooms: Number(item.bedrooms || 0),
        bathrooms: Number(item.bathrooms || 0),
        square_footage: Number(item.square_footage || 0)
      }))
    })
  });
  
  // React Query - Submit inquiry mutation
  const inquiryMutation = useMutation({
    mutationFn: submitGeneralInquiry,
    onSuccess: () => {
      showToast('Message sent successfully! The agent will contact you soon.', 'success');
      setContactFormData(prev => ({
        ...prev,
        subject: 'General Inquiry',
        message: ''
      }));
      setValidationErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to send message. Please try again.';
      showToast(errorMessage, 'error');
    }
  });
  
  // Redirect to 404 if agent not found or not approved
  React.useEffect(() => {
    if (profileError) {
      navigate('/404', { state: { message: 'Agent profile not available or has been deactivated.' } });
    }
  }, [profileError, navigate]);
  
  // Pre-fill form when user logs in
  React.useEffect(() => {
    if (currentUser) {
      setContactFormData(prev => ({
        ...prev,
        name: currentUser.full_name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone_number || prev.phone
      }));
    }
  }, [currentUser]);
  
  // Form handlers
  const handleFormChange = (field: string, value: string) => {
    setContactFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!contactFormData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!contactFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!contactFormData.message.trim()) {
      errors.message = 'Message is required';
    } else if (contactFormData.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const payload: InquiryPayload = {
      property_id: null,
      agent_id: agentProfile!.agent_id,
      user_id: currentUser?.user_id || null,
      inquirer_name: contactFormData.name,
      inquirer_email: contactFormData.email,
      inquirer_phone: contactFormData.phone || '',
      message: contactFormData.message,
      viewing_requested: false
    };
    
    inquiryMutation.mutate(payload);
  };
  
  // Filter listings client-side
  const filteredListings = listingsResponse?.data || [];
  const activeListingsCount = filteredListings.length;
  
  // Loading skeleton
  if (profileLoading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 h-48 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (!agentProfile) {
    return null;
  }
  
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };
  
  const formatPrice = (price: number | string, currency: string, listingType: string) => {
    const numPrice = Number(price || 0);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice);
    
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };
  
  return (
    <>
      {/* Hero Section - Agent Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 lg:p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  {agentProfile.profile_photo_url ? (
                    <img
                      src={agentProfile.profile_photo_url}
                      alt={agentProfile.full_name}
                      className="w-32 h-32 md:w-48 md:h-48 rounded-xl object-cover shadow-lg border-4 border-white"
                    />
                  ) : (
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border-4 border-white">
                      <span className="text-white text-5xl md:text-6xl font-bold">
                        {agentProfile.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Agent Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                      {agentProfile.full_name}
                    </h1>
                    {agentProfile.professional_title && (
                      <p className="text-xl text-gray-600 mt-2">{agentProfile.professional_title}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <p className="text-base text-gray-700 font-medium">{agentProfile.agency_name}</p>
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <a
                        href={`tel:${agentProfile.phone_number}`}
                        className="text-gray-900 hover:text-blue-600 transition-colors font-medium"
                      >
                        {formatPhoneNumber(agentProfile.phone_number)}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <a
                        href={`mailto:${agentProfile.email}`}
                        className="text-gray-900 hover:text-blue-600 transition-colors font-medium truncate"
                      >
                        {agentProfile.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <p className="text-gray-700">
                        {agentProfile.office_address_city}, {agentProfile.office_address_state}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <p className="text-gray-700 font-medium">
                        License: {agentProfile.license_number}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <a
                      href={`tel:${agentProfile.phone_number}`}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      Call Now
                    </a>
                    <a
                      href={`mailto:${agentProfile.email}`}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium border border-gray-300 transition-all duration-200 flex items-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      Email Agent
                    </a>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 pt-4">
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-blue-600">{activeListingsCount}</p>
                    </div>
                    <div className="bg-indigo-50 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="text-2xl font-bold text-indigo-600">{agentProfile.years_experience} years</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        
        {/* About Section */}
        {agentProfile.bio && (
          <section>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About {agentProfile.full_name}</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{agentProfile.bio}</p>
              </div>
            </div>
          </section>
        )}
        
        {/* Expertise Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Specializations */}
            {agentProfile.specializations && agentProfile.specializations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Specializations</h3>
                </div>
                <ul className="space-y-2">
                  {agentProfile.specializations.map((spec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Service Areas */}
            {agentProfile.service_areas && agentProfile.service_areas.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Service Areas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentProfile.service_areas.map((area, idx) => (
                    <Link
                      key={idx}
                      to={`/search?location=${encodeURIComponent(area)}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      {area}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Languages */}
            {agentProfile.languages_spoken && agentProfile.languages_spoken.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Languages className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Languages</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentProfile.languages_spoken.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </section>
        
        {/* Active Listings Section */}
        <section>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Active Listings</h2>
                <p className="text-gray-600 mt-1">({activeListingsCount} {activeListingsCount === 1 ? 'property' : 'properties'})</p>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setListingFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    listingFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setListingFilter('sale')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    listingFilter === 'sale'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  For Sale
                </button>
                <button
                  onClick={() => setListingFilter('rent')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    listingFilter === 'rent'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  For Rent
                </button>
              </div>
            </div>
            
            {/* Listings Grid */}
            {listingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse"></div>
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((property) => (
                  <Link
                    key={property.property_id}
                    to={`/property/${property.property_id}`}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  >
                    {/* Property Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                      {property.primary_photo?.thumbnail_url || property.primary_photo?.image_url ? (
                        <img
                          src={property.primary_photo.thumbnail_url || property.primary_photo.image_url}
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                          <Home className="w-16 h-16 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Listing Type Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-lg ${
                          property.listing_type === 'sale'
                            ? 'bg-green-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}>
                          For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Property Details */}
                    <div className="p-4 space-y-3">
                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(property.price, property.currency, property.listing_type)}
                        </p>
                      </div>
                      
                      {/* Address */}
                      <p className="text-gray-900 font-medium line-clamp-1">
                        {property.address_street}
                      </p>
                      <p className="text-sm text-gray-600">
                        {property.address_city}, {property.address_state}
                      </p>
                      
                      {/* Specs */}
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{Number(property.bedrooms)} bd</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bath className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{Number(property.bathrooms)} ba</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Maximize className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {Number(property.square_footage).toLocaleString()} sqft
                          </span>
                        </div>
                      </div>
                      
                      {/* Property Type */}
                      <div className="pt-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Listings</h3>
                <p className="text-gray-600">{agentProfile.full_name} currently has no active listings.</p>
                <p className="text-gray-500 text-sm mt-2">Check back soon for new properties!</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Contact Agent Section */}
        <section id="contact">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch with {agentProfile.full_name}</h2>
            
            {inquiryMutation.isSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-700 mb-6">
                  Your message has been sent to {agentProfile.full_name}. They'll get back to you shortly.
                </p>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-2">You can also reach out directly:</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href={`tel:${agentProfile.phone_number}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      {formatPhoneNumber(agentProfile.phone_number)}
                    </a>
                    <a
                      href={`mailto:${agentProfile.email}`}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {agentProfile.email}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => {
                    inquiryMutation.reset();
                    setContactFormData(prev => ({
                      ...prev,
                      subject: 'General Inquiry',
                      message: ''
                    }));
                  }}
                  className="mt-6 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={contactFormData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        validationErrors.name
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={contactFormData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        validationErrors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={contactFormData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="(123) 456-7890"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    />
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-900 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      value={contactFormData.subject}
                      onChange={(e) => handleFormChange('subject', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="I want to sell my property">I want to sell my property</option>
                      <option value="I'm looking to buy">I'm looking to buy</option>
                      <option value="I'm looking to rent">I'm looking to rent</option>
                      <option value="Schedule a consultation">Schedule a consultation</option>
                    </select>
                  </div>
                </div>
                
                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    value={contactFormData.message}
                    onChange={(e) => handleFormChange('message', e.target.value)}
                    placeholder="Tell the agent about your real estate needs..."
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 resize-none ${
                      validationErrors.message
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  ></textarea>
                  {validationErrors.message && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {contactFormData.message.length} / 2000 characters
                  </p>
                </div>
                
                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={inquiryMutation.isPending}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inquiryMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    By submitting, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
        
        {/* Certifications (if available) */}
        {agentProfile.certifications && agentProfile.certifications.length > 0 && (
          <section>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Certifications & Credentials</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agentProfile.certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-900 font-medium">{cert}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        
      </div>
    </>
  );
};

export default UV_AgentProfile;