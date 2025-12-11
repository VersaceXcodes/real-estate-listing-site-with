import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Home, MapPin, Bed, Bath, Ruler, Calendar, 
  Heart, Share2, ChevronLeft, ChevronRight, 
  X, Phone, Mail, Flag, Check, AlertCircle,
  Eye, MessageSquare, Star
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Property {
  property_id: string;
  agent_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land' | 'commercial';
  status: string;
  price: number;
  currency: string;
  price_per_sqft: number | null;
  rent_frequency: 'monthly' | 'weekly' | 'daily' | null;
  address_street: string;
  address_unit: string | null;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  latitude: string | null;
  longitude: string | null;
  neighborhood: string | null;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  lot_size: number | null;
  lot_size_unit: 'sqft' | 'acres' | null;
  year_built: number | null;
  property_style: string | null;
  floors: number | null;
  parking_spaces: number | null;
  parking_type: string | null;
  hoa_fee: number | null;
  hoa_frequency: 'monthly' | 'quarterly' | 'annually' | null;
  property_tax: number | null;
  mls_number: string | null;
  interior_features: string[] | null;
  exterior_features: string[] | null;
  appliances_included: string[] | null;
  utilities_systems: string[] | null;
  security_features: string[] | null;
  community_amenities: string[] | null;
  amenities: string[] | null;
  additional_features: string[] | null;
  highlights: string[] | null;
  furnished: boolean;
  pet_friendly: boolean;
  new_construction: boolean;
  recently_renovated: boolean;
  virtual_tour_available: boolean;
  open_house_scheduled: boolean;
  price_reduced: boolean;
  youtube_video_url: string | null;
  virtual_tour_url: string | null;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  days_on_market: number | null;
}

interface PropertyPhoto {
  photo_id: string;
  property_id: string;
  image_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_primary: boolean;
  caption: string | null;
  file_size: number | null;
  created_at: string;
}

interface Agent {
  agent_id: string;
  email: string;
  full_name: string;
  phone_number: string;
  agency_name: string;
  profile_photo_url: string | null;
  professional_title: string | null;
  bio: string | null;
  license_number: string;
  license_state: string;
}

interface InquiryFormData {
  property_id: string;
  agent_id: string;
  user_id: string | null;
  inquirer_name: string;
  inquirer_email: string;
  inquirer_phone: string;
  message: string;
  viewing_requested: boolean;
  preferred_viewing_date: string | null;
  preferred_viewing_time: string | null;
}

interface ValidationErrors {
  inquirer_name?: string;
  inquirer_email?: string;
  message?: string;
  preferred_viewing_date?: string;
  preferred_viewing_time?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchProperty = async (property_id: string): Promise<Property> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`
  );
  return data;
};

const fetchPropertyPhotos = async (property_id: string): Promise<PropertyPhoto[]> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos`
  );
  return data.data || [];
};

const fetchAgent = async (agent_id: string): Promise<Agent> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/${agent_id}`
  );
  return data;
};

const fetchSimilarProperties = async (params: {
  city: string;
  listing_type: string;
  property_type: string;
  min_price: number;
  max_price: number;
  exclude_id: string;
}): Promise<Property[]> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
    {
      params: {
        city: params.city,
        listing_type: params.listing_type,
        property_type: [params.property_type],
        min_price: params.min_price,
        max_price: params.max_price,
        status: ['active'],
        limit: 6,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    }
  );
  
  // Filter out current property
  const filtered = (data.data || []).filter((p: Property) => p.property_id !== params.exclude_id);
  return filtered.slice(0, 6);
};

const trackPropertyView = async (property_id: string, user_id: string | null) => {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/view`,
    {
      property_id,
      user_id,
      session_id: sessionStorage.getItem('session_id') || null
    }
  );
};

const submitInquiry = async (formData: InquiryFormData) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inquiries`,
    formData
  );
  return data;
};

const reportProperty = async (params: {
  property_id: string;
  reporter_user_id: string | null;
  reporter_email: string | null;
  reason: string;
  details: string | null;
}) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/property-reports`,
    params
  );
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_PropertyDetail: React.FC = () => {
  const { property_id } = useParams<{ property_id: string }>();
  const navigate = useNavigate();
  
  // ========== ZUSTAND STORE ACCESS (INDIVIDUAL SELECTORS) ==========
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const savedProperties = useAppStore(state => state.user_favorites.saved_properties);
  const addFavorite = useAppStore(state => state.add_favorite);
  const removeFavorite = useAppStore(state => state.remove_favorite);
  const showToast = useAppStore(state => state.show_toast);
  const openModal = useAppStore(state => state.open_modal);
  
  // ========== LOCAL STATE ==========
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [inquiryForm, setInquiryForm] = useState({
    inquirer_name: '',
    inquirer_email: '',
    inquirer_phone: '',
    message: '',
    viewing_requested: false,
    preferred_viewing_date: '',
    preferred_viewing_time: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  // ========== REACT QUERY: PROPERTY DETAILS ==========
  const { 
    data: property, 
    isLoading: propertyLoading, 
    error: propertyError 
  } = useQuery({
    queryKey: ['property', property_id],
    queryFn: () => fetchProperty(property_id!),
    enabled: !!property_id,
    staleTime: 300000, // 5 minutes
    retry: 1,
    select: (data) => ({
      ...data,
      // CRITICAL: Convert NUMERIC fields from strings to numbers
      price: Number(data.price || 0),
      price_per_sqft: data.price_per_sqft ? Number(data.price_per_sqft) : null,
      bathrooms: Number(data.bathrooms || 0),
      bedrooms: Number(data.bedrooms || 0),
      square_footage: Number(data.square_footage || 0),
      lot_size: data.lot_size ? Number(data.lot_size) : null,
      hoa_fee: data.hoa_fee ? Number(data.hoa_fee) : null,
      property_tax: data.property_tax ? Number(data.property_tax) : null,
      view_count: Number(data.view_count || 0),
      inquiry_count: Number(data.inquiry_count || 0),
      favorite_count: Number(data.favorite_count || 0),
    })
  });
  
  // ========== REACT QUERY: PROPERTY PHOTOS ==========
  const { data: photos = [] } = useQuery({
    queryKey: ['property-photos', property_id],
    queryFn: () => fetchPropertyPhotos(property_id!),
    enabled: !!property_id,
    staleTime: 600000, // 10 minutes
    select: (data) => data.sort((a, b) => a.display_order - b.display_order)
  });
  
  // ========== REACT QUERY: AGENT INFO ==========
  const { data: agent } = useQuery({
    queryKey: ['agent', property?.agent_id],
    queryFn: () => fetchAgent(property!.agent_id),
    enabled: !!property?.agent_id,
    staleTime: 600000
  });
  
  // ========== REACT QUERY: SIMILAR PROPERTIES ==========
  const { data: similarProperties = [] } = useQuery({
    queryKey: ['similar-properties', property_id],
    queryFn: () => fetchSimilarProperties({
      city: property!.address_city,
      listing_type: property!.listing_type,
      property_type: property!.property_type,
      min_price: Math.floor(property!.price * 0.8),
      max_price: Math.ceil(property!.price * 1.2),
      exclude_id: property_id!
    }),
    enabled: !!property && !!property_id,
    staleTime: 300000,
    select: (data) => data.map(item => ({
      ...item,
      price: Number(item.price || 0),
      bedrooms: Number(item.bedrooms || 0),
      bathrooms: Number(item.bathrooms || 0),
      square_footage: Number(item.square_footage || 0),
    }))
  });
  
  // ========== MUTATION: TRACK VIEW ==========
  const trackViewMutation = useMutation({
    mutationFn: () => trackPropertyView(property_id!, currentUser?.user_id || null),
    retry: 0 // Fire-and-forget, don't retry
  });
  
  // ========== MUTATION: SUBMIT INQUIRY ==========
  const inquiryMutation = useMutation({
    mutationFn: submitInquiry,
    onSuccess: () => {
      setInquiryForm(prev => ({
        ...prev,
        submitting: false,
        submit_success: true
      }));
      showToast('Inquiry sent successfully! The agent will contact you soon.', 'success');
      
      // Clear form after 3 seconds
      setTimeout(() => {
        setInquiryForm({
          inquirer_name: currentUser?.full_name || '',
          inquirer_email: currentUser?.email || '',
          inquirer_phone: currentUser?.phone_number || '',
          message: '',
          viewing_requested: false,
          preferred_viewing_date: '',
          preferred_viewing_time: ''
        });
      }, 3000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to send inquiry. Please try again.';
      showToast(message, 'error');
    }
  });
  
  // ========== MUTATION: REPORT PROPERTY ==========
  const reportMutation = useMutation({
    mutationFn: reportProperty,
    onSuccess: () => {
      setReportModalOpen(false);
      setReportReason('');
      setReportDetails('');
      showToast('Thank you for your report. We will review this listing.', 'success');
    },
    onError: () => {
      showToast('Failed to submit report. Please try again.', 'error');
    }
  });
  
  // ========== DERIVED STATE ==========
  const isSaved = property_id ? savedProperties.includes(property_id) : false;
  
  // ========== EFFECTS ==========
  
  // Pre-fill inquiry form for authenticated users
  useEffect(() => {
    if (property && currentUser) {
      setInquiryForm(prev => ({
        ...prev,
        inquirer_name: currentUser.full_name || '',
        inquirer_email: currentUser.email || '',
        inquirer_phone: currentUser.phone_number || '',
        message: `Hi, I'm interested in ${property.address_street}, ${property.address_city}, ${property.address_state}. Is it still available? I'd like to schedule a viewing.`
      }));
    } else if (property && !currentUser) {
      setInquiryForm(prev => ({
        ...prev,
        message: `Hi, I'm interested in ${property.address_street}, ${property.address_city}, ${property.address_state}. Is it still available? I'd like to schedule a viewing.`
      }));
    }
  }, [property, currentUser]);
  
  // Track property view (once per session)
  useEffect(() => {
    if (property_id) {
      const viewKey = `viewed_${property_id}`;
      if (!sessionStorage.getItem(viewKey)) {
        trackViewMutation.mutate();
        sessionStorage.setItem(viewKey, 'true');
      }
    }
  }, [property_id, trackViewMutation]);
  
  // Handle 404
  useEffect(() => {
    if (propertyError) {
      navigate('/404', { 
        state: { 
          message: 'This property listing may have been removed or does not exist.' 
        } 
      });
    }
  }, [propertyError, navigate]);
  
  // ========== HANDLERS ==========
  
  const goToNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);
  
  const goToPreviousImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);
  
  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'ArrowLeft') goToPreviousImage();
        if (e.key === 'ArrowRight') goToNextImage();
        if (e.key === 'Escape') setLightboxOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentImageIndex, photos.length, goToNextImage, goToPreviousImage]);
  
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      openModal('auth_modal');
      return;
    }
    
    if (!property_id) return;
    
    try {
      if (isSaved) {
        await removeFavorite(property_id);
        showToast('Property removed from saved', 'success');
      } else {
        await addFavorite(property_id);
        showToast('Property saved to favorites', 'success');
      }
    } catch {
      showToast('Failed to update favorites', 'error');
    }
  };
  
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: ValidationErrors = {};
    
    if (!inquiryForm.inquirer_name.trim()) {
      errors.inquirer_name = 'Name is required';
    }
    
    if (!inquiryForm.inquirer_email.trim()) {
      errors.inquirer_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryForm.inquirer_email)) {
      errors.inquirer_email = 'Please enter a valid email address';
    }
    
    if (!inquiryForm.message.trim()) {
      errors.message = 'Message is required';
    } else if (inquiryForm.message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    if (inquiryForm.viewing_requested) {
      if (!inquiryForm.preferred_viewing_date) {
        errors.preferred_viewing_date = 'Please select a preferred date';
      }
      if (!inquiryForm.preferred_viewing_time) {
        errors.preferred_viewing_time = 'Please select a preferred time';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    if (!property) return;
    
    const submissionData: InquiryFormData = {
      property_id: property.property_id,
      agent_id: property.agent_id,
      user_id: currentUser?.user_id || null,
      inquirer_name: inquiryForm.inquirer_name,
      inquirer_email: inquiryForm.inquirer_email,
      inquirer_phone: inquiryForm.inquirer_phone || '',
      message: inquiryForm.message,
      viewing_requested: inquiryForm.viewing_requested,
      preferred_viewing_date: inquiryForm.viewing_requested ? inquiryForm.preferred_viewing_date : null,
      preferred_viewing_time: inquiryForm.viewing_requested ? inquiryForm.preferred_viewing_time : null
    };
    
    inquiryMutation.mutate(submissionData);
  };
  
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportReason || !property_id) return;
    
    reportMutation.mutate({
      property_id,
      reporter_user_id: currentUser?.user_id || null,
      reporter_email: !currentUser ? inquiryForm.inquirer_email : null,
      reason: reportReason,
      details: reportDetails || null
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
  };
  
  // ========== UTILITY FUNCTIONS ==========
  
  const formatPrice = (price: number, currency: string, listing_type: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
    
    return listing_type === 'rent' ? `${formatted}/month` : formatted;
  };
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  const getFullAddress = () => {
    if (!property) return '';
    const parts = [
      property.address_street,
      property.address_unit,
      property.address_city,
      property.address_state,
      property.address_zip
    ].filter(Boolean);
    return parts.join(', ');
  };
  
  const calculateDaysOnMarket = () => {
    if (!property?.published_at) return null;
    const published = new Date(property.published_at);
    const now = new Date();
    const diffTime = now.getTime() - published.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // ========== LOADING STATE ==========
  if (propertyLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-96 bg-gray-200 rounded-xl mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-64 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (!property) {
    return null;
  }
  
  const daysOnMarket = calculateDaysOnMarket();
  
  // ========== MAIN RENDER ==========
  return (
    <>
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <span>/</span>
            <Link 
              to={`/search?listing_type=${property.listing_type}`} 
              className="hover:text-blue-600 transition-colors"
            >
              {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
            </Link>
            <span>/</span>
            <Link 
              to={`/search?location=${property.address_city}`} 
              className="hover:text-blue-600 transition-colors"
            >
              {property.address_city}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">
              {property.address_street}
            </span>
          </nav>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Photo Gallery */}
          <div className="mb-8">
            <div className="relative rounded-xl overflow-hidden shadow-lg bg-white">
              {/* Main Image */}
              <div className="relative aspect-[16/9] bg-gray-900">
                {photos.length > 0 ? (
                  <>
                    <img 
                      src={photos[currentImageIndex]?.image_url} 
                      alt={`Property photo ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation Arrows */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={goToPreviousImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all hover:scale-110"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={goToNextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all hover:scale-110"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    
                    {/* Photo Counter */}
                    <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {photos.length}
                    </div>
                    
                    {/* Fullscreen Button */}
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105 text-sm font-medium"
                    >
                      View All Photos
                    </button>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={handleFavoriteToggle}
                      className="absolute top-4 right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
                      aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart 
                        className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                      />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Home className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p>No photos available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="bg-white p-4 overflow-x-auto">
                  <div className="flex space-x-2">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.photo_id}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex 
                            ? 'border-blue-600 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img 
                          src={photo.thumbnail_url || photo.image_url} 
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Property Details */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Property Header */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                      {property.title}
                    </h1>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-5 h-5" />
                      <span className="text-lg">{getFullAddress()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShareModalOpen(true)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      aria-label="Share property"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      aria-label="Report listing"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Price & Status */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      {formatPrice(property.price, property.currency, property.listing_type)}
                    </div>
                    {property.price_per_sqft && (
                      <div className="text-sm text-gray-600">
                        ${Number(property.price_per_sqft).toFixed(0)}/sqft
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      property.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : property.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                    
                    {daysOnMarket !== null && (
                      <span className="text-sm text-gray-600">
                        Listed {daysOnMarket} day{daysOnMarket !== 1 ? 's' : ''} ago
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Bed className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                      <div className="text-sm text-gray-600">Bedrooms</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Bath className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                      <div className="text-sm text-gray-600">Bathrooms</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Ruler className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatNumber(property.square_footage)}
                      </div>
                      <div className="text-sm text-gray-600">Sq Ft</div>
                    </div>
                  </div>
                  
                  {property.lot_size && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Home className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatNumber(property.lot_size)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {property.lot_size_unit || 'sqft'} lot
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {property.year_built && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{property.year_built}</div>
                        <div className="text-sm text-gray-600">Year Built</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
                
                {property.mls_number && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">MLS# {property.mls_number}</p>
                  </div>
                )}
              </div>

              {/* Property Details Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b border-gray-200 pb-3">
                    <span className="text-sm text-gray-600">Property Type</span>
                    <p className="text-base font-semibold text-gray-900 mt-1 capitalize">
                      {property.property_type.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-3">
                    <span className="text-sm text-gray-600">Listing Type</span>
                    <p className="text-base font-semibold text-gray-900 mt-1 capitalize">
                      For {property.listing_type}
                    </p>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-3">
                    <span className="text-sm text-gray-600">Price</span>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      {formatPrice(property.price, property.currency, property.listing_type)}
                    </p>
                  </div>
                  
                  {property.price_per_sqft && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">Price per Sq Ft</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        ${Number(property.price_per_sqft).toFixed(0)}
                      </p>
                    </div>
                  )}
                  
                  {property.hoa_fee && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">HOA Fee</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        ${formatNumber(property.hoa_fee)}/{property.hoa_frequency || 'month'}
                      </p>
                    </div>
                  )}
                  
                  {property.property_tax && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">Property Tax</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        ${formatNumber(property.property_tax)}/year
                      </p>
                    </div>
                  )}
                  
                  {property.property_style && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">Architecture Style</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">{property.property_style}</p>
                    </div>
                  )}
                  
                  {property.floors && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">Floors</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">{property.floors}</p>
                    </div>
                  )}
                  
                  {property.parking_spaces !== null && (
                    <div className="border-b border-gray-200 pb-3">
                      <span className="text-sm text-gray-600">Parking</span>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {property.parking_spaces} space{property.parking_spaces !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Features & Amenities */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Features & Amenities</h2>
                
                <div className="space-y-6">
                  {property.interior_features && property.interior_features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Interior Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {property.interior_features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-gray-700">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {property.exterior_features && property.exterior_features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Exterior Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {property.exterior_features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-gray-700">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {property.appliances_included && property.appliances_included.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Appliances Included</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {property.appliances_included.map((appliance, index) => (
                          <div key={index} className="flex items-center space-x-2 text-gray-700">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{appliance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {property.amenities && property.amenities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {property.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center space-x-2 text-gray-700">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Property Highlights */}
                {property.highlights && property.highlights.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Highlights</h3>
                    <ul className="space-y-2">
                      {property.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start space-x-2 text-gray-700">
                          <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Location & Map */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
                <div className="mb-4">
                  <p className="text-lg text-gray-700">{getFullAddress()}</p>
                  {property.neighborhood && (
                    <p className="text-sm text-gray-600 mt-1">{property.neighborhood}</p>
                  )}
                </div>
                
                {property.latitude && property.longitude && (
                  <div className="aspect-[16/9] bg-gray-200 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Map view would appear here</p>
                        <p className="text-xs mt-1">
                          Coordinates: {property.latitude}, {property.longitude}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Contact Form */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8" id="contact-form">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Agent About This Property</h2>
                
                {inquiryMutation.isSuccess ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 mb-6">
                      Your inquiry has been sent to {agent?.full_name}. They'll get back to you shortly.
                    </p>
                    
                    {agent && (
                      <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                        <p className="text-sm text-gray-600 mb-2">You can also contact them directly:</p>
                        <div className="space-y-2">
                          <a 
                            href={`tel:${agent.phone_number}`} 
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                          >
                            <Phone className="w-4 h-4" />
                            <span>{agent.phone_number}</span>
                          </a>
                          <a 
                            href={`mailto:${agent.email}`} 
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                          >
                            <Mail className="w-4 h-4" />
                            <span>{agent.email}</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={inquiryForm.inquirer_name}
                          onChange={(e) => {
                            setInquiryForm(prev => ({ ...prev, inquirer_name: e.target.value }));
                            setValidationErrors(prev => ({ ...prev, inquirer_name: undefined }));
                          }}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.inquirer_name 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 focus:outline-none transition-all`}
                          placeholder="Enter your full name"
                        />
                        {validationErrors.inquirer_name && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.inquirer_name}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Your Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={inquiryForm.inquirer_email}
                          onChange={(e) => {
                            setInquiryForm(prev => ({ ...prev, inquirer_email: e.target.value }));
                            setValidationErrors(prev => ({ ...prev, inquirer_email: undefined }));
                          }}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.inquirer_email 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 focus:outline-none transition-all`}
                          placeholder="your.email@example.com"
                        />
                        {validationErrors.inquirer_email && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.inquirer_email}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={inquiryForm.inquirer_phone}
                        onChange={(e) => setInquiryForm(prev => ({ ...prev, inquirer_phone: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Message *
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        value={inquiryForm.message}
                        onChange={(e) => {
                          setInquiryForm(prev => ({ ...prev, message: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, message: undefined }));
                        }}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validationErrors.message 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 focus:outline-none transition-all resize-none`}
                        placeholder="Enter your message..."
                      />
                      <div className="flex justify-between items-center mt-1">
                        {validationErrors.message ? (
                          <p className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.message}
                          </p>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {inquiryForm.message.length} / 2000
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Viewing Request */}
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inquiryForm.viewing_requested}
                          onChange={(e) => setInquiryForm(prev => ({ 
                            ...prev, 
                            viewing_requested: e.target.checked,
                            preferred_viewing_date: e.target.checked ? prev.preferred_viewing_date : '',
                            preferred_viewing_time: e.target.checked ? prev.preferred_viewing_time : ''
                          }))}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          I'd like to schedule a viewing
                        </span>
                      </label>
                      
                      {inquiryForm.viewing_requested && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                          <div>
                            <label htmlFor="viewing-date" className="block text-sm font-medium text-gray-700 mb-2">
                              Preferred Date *
                            </label>
                            <input
                              type="date"
                              id="viewing-date"
                              value={inquiryForm.preferred_viewing_date}
                              onChange={(e) => {
                                setInquiryForm(prev => ({ ...prev, preferred_viewing_date: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, preferred_viewing_date: undefined }));
                              }}
                              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                              className={`w-full px-4 py-3 rounded-lg border-2 ${
                                validationErrors.preferred_viewing_date 
                                  ? 'border-red-300' 
                                  : 'border-gray-200'
                              } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all`}
                            />
                            {validationErrors.preferred_viewing_date && (
                              <p className="mt-1 text-sm text-red-600">{validationErrors.preferred_viewing_date}</p>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="viewing-time" className="block text-sm font-medium text-gray-700 mb-2">
                              Preferred Time *
                            </label>
                            <select
                              id="viewing-time"
                              value={inquiryForm.preferred_viewing_time}
                              onChange={(e) => {
                                setInquiryForm(prev => ({ ...prev, preferred_viewing_time: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, preferred_viewing_time: undefined }));
                              }}
                              className={`w-full px-4 py-3 rounded-lg border-2 ${
                                validationErrors.preferred_viewing_time 
                                  ? 'border-red-300' 
                                  : 'border-gray-200'
                              } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all`}
                            >
                              <option value="">Select time</option>
                              <option value="Morning (9AM-12PM)">Morning (9AM-12PM)</option>
                              <option value="Afternoon (12PM-5PM)">Afternoon (12PM-5PM)</option>
                              <option value="Evening (5PM-8PM)">Evening (5PM-8PM)</option>
                            </select>
                            {validationErrors.preferred_viewing_time && (
                              <p className="mt-1 text-sm text-red-600">{validationErrors.preferred_viewing_time}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={inquiryMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {inquiryMutation.isPending ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send Message</span>
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      By submitting, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </form>
                )}
              </div>

              {/* Similar Properties */}
              {similarProperties.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Properties</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {similarProperties.map((prop) => (
                      <Link
                        key={prop.property_id}
                        to={`/property/${prop.property_id}`}
                        className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                      >
                        <div className="aspect-[4/3] bg-gray-200 overflow-hidden">
                          {photos.length > 0 && photos[0].image_url ? (
                            <img 
                              src={photos[0].thumbnail_url || photos[0].image_url} 
                              alt={prop.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <div className="text-xl font-bold text-blue-600 mb-2">
                            {formatPrice(prop.price, prop.currency, prop.listing_type)}
                          </div>
                          <p className="text-gray-900 font-medium mb-2 line-clamp-1">
                            {prop.address_street}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            {prop.address_city}, {prop.address_state}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Bed className="w-4 h-4" />
                              <span>{prop.bedrooms} bd</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Bath className="w-4 h-4" />
                              <span>{prop.bathrooms} ba</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Ruler className="w-4 h-4" />
                              <span>{formatNumber(prop.square_footage)} sqft</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Agent Card (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {agent && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Listed By</h3>
                    
                    <Link 
                      to={`/agent/${agent.agent_id}`}
                      className="block group"
                    >
                      <div className="flex items-center space-x-4 mb-4">
                        {agent.profile_photo_url ? (
                          <img 
                            src={agent.profile_photo_url} 
                            alt={agent.full_name}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl ring-2 ring-gray-200 group-hover:ring-blue-500 transition-all">
                            {agent.full_name.charAt(0)}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {agent.full_name}
                          </h4>
                          {agent.professional_title && (
                            <p className="text-sm text-gray-600">{agent.professional_title}</p>
                          )}
                          <p className="text-sm text-gray-600">{agent.agency_name}</p>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="space-y-3 mb-6">
                      <a 
                        href={`tel:${agent.phone_number}`}
                        className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        <span className="text-sm">{agent.phone_number}</span>
                      </a>
                      
                      <a 
                        href={`mailto:${agent.email}`}
                        className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        <span className="text-sm">{agent.email}</span>
                      </a>
                      
                      <p className="text-sm text-gray-600">
                        License #: {agent.license_number}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <a
                        href={`tel:${agent.phone_number}`}
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Call Agent
                      </a>
                      
                      <a
                        href="#contact-form"
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 text-center font-medium py-3 px-4 rounded-lg border border-gray-300 transition-all duration-200"
                      >
                        Send Message
                      </a>
                      
                      <Link
                        to={`/agent/${agent.agent_id}`}
                        className="block w-full text-blue-600 hover:text-blue-700 text-center font-medium py-3 px-4 rounded-lg hover:bg-blue-50 transition-all duration-200"
                      >
                        View Agent Profile
                      </Link>
                    </div>
                    
                    {/* Stats */}
                    <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center text-gray-400 mb-1">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{property.view_count}</div>
                        <div className="text-xs text-gray-600">Views</div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-center text-gray-400 mb-1">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{property.inquiry_count}</div>
                        <div className="text-xs text-gray-600">Inquiries</div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-center text-gray-400 mb-1">
                          <Heart className="w-4 h-4" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">{property.favorite_count}</div>
                        <div className="text-xs text-gray-600">Favorites</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-all z-10"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          
          {photos.length > 0 && (
            <>
              <img 
                src={photos[currentImageIndex]?.image_url} 
                alt={`Property photo ${currentImageIndex + 1}`}
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
              
              {photos.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-4 rounded-full shadow-lg transition-all hover:scale-110"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-4 rounded-full shadow-lg transition-all hover:scale-110"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Share This Property</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="w-full flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Copy Link</span>
              </button>
              
              <a
                href={`mailto:?subject=Check out this property&body=${window.location.href}`}
                className="w-full flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Email</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Report This Listing</h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                >
                  <option value="">Select a reason</option>
                  <option value="Incorrect Information">Incorrect Information</option>
                  <option value="Suspicious Listing">Suspicious Listing</option>
                  <option value="Inappropriate Content">Inappropriate Content</option>
                  <option value="Spam">Spam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all resize-none"
                  placeholder="Please provide any additional details..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportMutation.isPending || !reportReason}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_PropertyDetail;