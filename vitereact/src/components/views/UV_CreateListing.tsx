import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Home, DollarSign, MapPin, Image, Video, Save, Eye, ArrowLeft, Upload, X, GripVertical, Check } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ListingFormData {
  agent_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land' | 'commercial';
  status: 'draft' | 'active';
  price: number | null;
  currency: string;
  rent_frequency: 'monthly' | 'weekly' | 'daily' | null;
  address_street: string;
  address_unit: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  latitude: string | null;
  longitude: string | null;
  neighborhood: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size: number | null;
  lot_size_unit: 'sqft' | 'acres' | null;
  year_built: number | null;
  property_style: string;
  floors: number | null;
  parking_spaces: number | null;
  parking_type: string;
  hoa_fee: number | null;
  hoa_frequency: 'monthly' | 'quarterly' | 'annually' | null;
  property_tax: number | null;
  mls_number: string;
  interior_features: string[];
  exterior_features: string[];
  appliances_included: string[];
  utilities_systems: string[];
  security_features: string[];
  community_amenities: string[];
  amenities: string[];
  additional_features: string[];
  highlights: string[];
  furnished: boolean;
  pet_friendly: boolean;
  new_construction: boolean;
  recently_renovated: boolean;
  virtual_tour_available: boolean;
  open_house_scheduled: boolean;
  price_reduced: boolean;
  youtube_video_url: string;
  virtual_tour_url: string;
}

interface PhotoUpload {
  photo_id: string;
  file: File | null;
  preview_url: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  display_order: number;
  is_primary: boolean;
  uploading: boolean;
  upload_progress: number;
  upload_error: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CreateListing: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors only
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const agentToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const showToast = useAppStore(state => state.show_toast);
  
  // ========== STATE VARIABLES ==========
  
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  
  const [listingFormData, setListingFormData] = useState<ListingFormData>({
    agent_id: currentAgent?.agent_id || '',
    title: '',
    description: '',
    listing_type: 'sale',
    property_type: 'house',
    status: 'draft',
    price: null,
    currency: 'USD',
    rent_frequency: null,
    address_street: '',
    address_unit: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_country: 'United States',
    latitude: null,
    longitude: null,
    neighborhood: '',
    bedrooms: null,
    bathrooms: null,
    square_footage: null,
    lot_size: null,
    lot_size_unit: null,
    year_built: null,
    property_style: '',
    floors: null,
    parking_spaces: null,
    parking_type: '',
    hoa_fee: null,
    hoa_frequency: null,
    property_tax: null,
    mls_number: '',
    interior_features: [],
    exterior_features: [],
    appliances_included: [],
    utilities_systems: [],
    security_features: [],
    community_amenities: [],
    amenities: [],
    additional_features: [],
    highlights: [],
    furnished: false,
    pet_friendly: false,
    new_construction: false,
    recently_renovated: false,
    virtual_tour_available: false,
    open_house_scheduled: false,
    price_reduced: false,
    youtube_video_url: '',
    virtual_tour_url: ''
  });
  
  const [photosState, setPhotosState] = useState<{
    uploaded_photos: PhotoUpload[];
    upload_queue: File[];
    uploading: boolean;
    max_photos: number;
    min_photos: number;
  }>({
    uploaded_photos: [],
    upload_queue: [],
    uploading: false,
    max_photos: 50,
    min_photos: 1
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveMode, setSaveMode] = useState<'draft' | 'publish' | null>(null);
  
  const [autoSaveState, setAutoSaveState] = useState<{
    last_auto_save: Date | null;
    auto_saving: boolean;
  }>({
    last_auto_save: null,
    auto_saving: false
  });
  
  const [mapPreview, setMapPreview] = useState<{
    center: { lat: number; lng: number } | null;
    pin_position: { lat: number; lng: number } | null;
    geocoding_loading: boolean;
  }>({
    center: null,
    pin_position: null,
    geocoding_loading: false
  });
  
  const [activeSection, setActiveSection] = useState<number>(1);
  
  // ========== REDIRECT IF NOT AUTHENTICATED ==========
  
  useEffect(() => {
    if (!isAgentAuthenticated || !currentAgent?.approved) {
      navigate('/agent/login');
    }
  }, [isAgentAuthenticated, currentAgent, navigate]);
  
  // ========== API MUTATIONS ==========
  
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, photo_id }: { file: File; photo_id: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('photo_type', 'property');
      formData.append('agent_id', currentAgent?.agent_id || '');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/upload/photo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            
            setPhotosState(prev => ({
              ...prev,
              uploaded_photos: prev.uploaded_photos.map(p =>
                p.photo_id === photo_id
                  ? { ...p, upload_progress: percentCompleted }
                  : p
              )
            }));
          }
        }
      );
      
      return { ...response.data, photo_id };
    }
  });
  
  const geocodeAddressMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/geocode`,
        {
          params: { address },
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data;
    }
  });
  
  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
        propertyData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data;
    }
  });
  
  const savePhotosMutation = useMutation({
    mutationFn: async ({ property_id, photos }: { property_id: string; photos: any[] }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos`,
        { photos },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data;
    }
  });
  
  // ========== HELPER FUNCTIONS ==========
  
  const validateForm = useCallback((forPublish: boolean = false): boolean => {
    const errors: Record<string, string> = {};
    
    if (forPublish) {
      if (!listingFormData.title || listingFormData.title.length < 10) {
        errors.title = "Title must be at least 10 characters";
      }
      if (!listingFormData.description || listingFormData.description.length < 50) {
        errors.description = "Description must be at least 50 characters";
      }
      if (!listingFormData.price || listingFormData.price <= 0) {
        errors.price = "Price is required and must be greater than 0";
      }
      if (!listingFormData.address_street) {
        errors.address_street = "Street address is required";
      }
      if (!listingFormData.address_city) {
        errors.address_city = "City is required";
      }
      if (!listingFormData.address_state) {
        errors.address_state = "State is required";
      }
      if (!listingFormData.address_zip) {
        errors.address_zip = "ZIP code is required";
      }
      if (photosState.uploaded_photos.length < photosState.min_photos) {
        errors.photos = "At least 1 photo is required";
      }
      if (photosState.uploaded_photos.some(p => p.uploading)) {
        errors.photos = "Please wait for all photos to finish uploading";
      }
    }
    
    if (listingFormData.price && listingFormData.square_footage) {
      // No explicit validation, just calculate
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [listingFormData, photosState]);
  
  const calculatePricePerSqft = useCallback(() => {
    if (listingFormData.price && listingFormData.square_footage && listingFormData.square_footage > 0) {
      return Math.round(listingFormData.price / listingFormData.square_footage);
    }
    return null;
  }, [listingFormData.price, listingFormData.square_footage]);
  
  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles = Array.from(files);
    
    if (photosState.uploaded_photos.length + newFiles.length > photosState.max_photos) {
      showToast(`Maximum ${photosState.max_photos} photos allowed`, 'error');
      return;
    }
    
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name} exceeds 10MB`, 'error');
        return false;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        showToast(`${file.name} must be JPG or PNG`, 'error');
        return false;
      }
      return true;
    });
    
    validFiles.forEach((file, index) => {
      const photo_id = `temp_${Date.now()}_${index}`;
      const preview_url = URL.createObjectURL(file);
      const display_order = photosState.uploaded_photos.length + index + 1;
      
      const photoUpload: PhotoUpload = {
        photo_id,
        file,
        preview_url,
        image_url: null,
        thumbnail_url: null,
        display_order,
        is_primary: photosState.uploaded_photos.length === 0 && index === 0,
        uploading: true,
        upload_progress: 0,
        upload_error: null
      };
      
      setPhotosState(prev => ({
        ...prev,
        uploaded_photos: [...prev.uploaded_photos, photoUpload],
        uploading: true
      }));
      
      uploadPhotoMutation.mutate({ file, photo_id }, {
        onSuccess: (data) => {
          setPhotosState(prev => ({
            ...prev,
            uploaded_photos: prev.uploaded_photos.map(p =>
              p.photo_id === photo_id
                ? {
                    ...p,
                    image_url: data.image_url,
                    thumbnail_url: data.thumbnail_url,
                    uploading: false,
                    upload_progress: 100
                  }
                : p
            ),
            uploading: prev.uploaded_photos.some(p => p.photo_id !== photo_id && p.uploading)
          }));
        },
        onError: (error: any) => {
          setPhotosState(prev => ({
            ...prev,
            uploaded_photos: prev.uploaded_photos.map(p =>
              p.photo_id === photo_id
                ? {
                    ...p,
                    uploading: false,
                    upload_error: error.message || 'Upload failed'
                  }
                : p
            ),
            uploading: prev.uploaded_photos.some(p => p.photo_id !== photo_id && p.uploading)
          }));
        }
      });
    });
  }, [photosState, uploadPhotoMutation, showToast]);
  
  const removePhoto = useCallback((photo_id: string) => {
    setPhotosState(prev => {
      const filtered = prev.uploaded_photos.filter(p => p.photo_id !== photo_id);
      return {
        ...prev,
        uploaded_photos: filtered.map((photo, index) => ({
          ...photo,
          display_order: index + 1,
          is_primary: index === 0
        }))
      };
    });
  }, []);
  
  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setPhotosState(prev => {
      const photos = [...prev.uploaded_photos];
      const [moved] = photos.splice(fromIndex, 1);
      photos.splice(toIndex, 0, moved);
      
      return {
        ...prev,
        uploaded_photos: photos.map((photo, index) => ({
          ...photo,
          display_order: index + 1,
          is_primary: index === 0
        }))
      };
    });
  }, []);
  
  const handleGeocode = useCallback(async () => {
    const { address_street, address_city, address_state, address_zip } = listingFormData;
    
    if (!address_street || !address_city || !address_state) {
      return;
    }
    
    const fullAddress = `${address_street}, ${address_city}, ${address_state} ${address_zip}`;
    
    setMapPreview(prev => ({ ...prev, geocoding_loading: true }));
    
    geocodeAddressMutation.mutate(fullAddress, {
      onSuccess: (data) => {
        setListingFormData(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude
        }));
        
        const position = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude)
        };
        
        setMapPreview({
          center: position,
          pin_position: position,
          geocoding_loading: false
        });
      },
      onError: () => {
        setMapPreview(prev => ({ ...prev, geocoding_loading: false }));
        showToast('Could not verify address. Please check and try again.', 'warning');
      }
    });
  }, [listingFormData, geocodeAddressMutation, showToast]);
  
  const handleSave = useCallback(async (mode: 'draft' | 'publish') => {
    setSaveMode(mode);
    setSubmitting(true);
    setValidationErrors({});
    
    const isValid = validateForm(mode === 'publish');
    
    if (!isValid) {
      setSubmitting(false);
      setSaveMode(null);
      showToast('Please fix validation errors before saving', 'error');
      return;
    }
    
    const propertyData = {
      ...listingFormData,
      agent_id: currentAgent?.agent_id || '',
      status: mode === 'draft' ? 'draft' : 'active',
      price_per_sqft: calculatePricePerSqft()
    };
    
    createPropertyMutation.mutate(propertyData, {
      onSuccess: async (response) => {
        const property_id = response.property_id;
        setCreatedPropertyId(property_id);
        
        // Save photos if any uploaded
        if (photosState.uploaded_photos.length > 0) {
          const photosToSave = photosState.uploaded_photos
            .filter(p => p.image_url)
            .map(p => ({
              image_url: p.image_url,
              thumbnail_url: p.thumbnail_url,
              display_order: p.display_order,
              is_primary: p.is_primary,
              caption: null
            }));
          
          try {
            await savePhotosMutation.mutateAsync({ property_id, photos: photosToSave });
          } catch (error) {
            console.error('Failed to save photos:', error);
          }
        }
        
        setSubmitting(false);
        setSaveMode(null);
        
        if (mode === 'publish') {
          showToast('Listing published successfully!', 'success', 5000);
          navigate(`/agent/listings/edit/${property_id}`);
        } else {
          showToast('Listing saved as draft', 'success');
          setAutoSaveState(prev => ({ ...prev, last_auto_save: new Date() }));
        }
      },
      onError: (error: any) => {
        setSubmitting(false);
        setSaveMode(null);
        const errorMessage = error.response?.data?.error?.message || 'Failed to save listing';
        showToast(errorMessage, 'error');
      }
    });
  }, [listingFormData, currentAgent, photosState, validateForm, calculatePricePerSqft, createPropertyMutation, savePhotosMutation, showToast, navigate]);
  
  // ========== AUTO-SAVE ==========
  
  useEffect(() => {
    if (!listingFormData.title && !listingFormData.description) {
      return;
    }
    
    const autoSaveInterval = setInterval(() => {
      if (!submitting && !autoSaveState.auto_saving) {
        setAutoSaveState(prev => ({ ...prev, auto_saving: true }));
        
        // Silent auto-save as draft
        const propertyData = {
          ...listingFormData,
          agent_id: currentAgent?.agent_id || '',
          status: 'draft',
          price_per_sqft: calculatePricePerSqft()
        };
        
        createPropertyMutation.mutate(propertyData, {
          onSuccess: (response) => {
            if (!createdPropertyId) {
              setCreatedPropertyId(response.property_id);
            }
            setAutoSaveState({
              last_auto_save: new Date(),
              auto_saving: false
            });
          },
          onError: () => {
            setAutoSaveState(prev => ({ ...prev, auto_saving: false }));
          }
        });
      }
    }, 30000);
    
    return () => clearInterval(autoSaveInterval);
  }, [listingFormData, submitting, autoSaveState.auto_saving, currentAgent, calculatePricePerSqft, createPropertyMutation, createdPropertyId]);
  
  // ========== FORM HANDLERS ==========
  
  const updateFormField = useCallback((field: keyof ListingFormData, value: any) => {
    setListingFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);
  
  const toggleFeature = useCallback((category: keyof ListingFormData, feature: string) => {
    setListingFormData(prev => {
      const currentFeatures = prev[category] as string[];
      const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter(f => f !== feature)
        : [...currentFeatures, feature];
      return { ...prev, [category]: newFeatures };
    });
  }, []);
  
  const addHighlight = useCallback(() => {
    if (listingFormData.highlights.length < 10) {
      setListingFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, '']
      }));
    }
  }, [listingFormData.highlights]);
  
  const updateHighlight = useCallback((index: number, value: string) => {
    setListingFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  }, []);
  
  const removeHighlight = useCallback((index: number) => {
    setListingFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  }, []);
  
  // ========== RENDER ==========
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/agent/listings')}
                  className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">Back to Listings</span>
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                {autoSaveState.last_auto_save && (
                  <span className="text-xs text-gray-500 flex items-center space-x-1">
                    {autoSaveState.auto_saving ? (
                      <>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        <span>Saved {new Date(autoSaveState.last_auto_save).toLocaleTimeString()}</span>
                      </>
                    )}
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save as Draft</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => window.open(`/property/preview/${createdPropertyId}`, '_blank')}
                  disabled={!createdPropertyId}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSave('publish')}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {submitting && saveMode === 'publish' ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Publishing...</span>
                    </span>
                  ) : (
                    'Publish Listing'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Form Sections</h3>
                <nav className="space-y-2">
                  {[
                    { id: 1, name: 'Basic Information', icon: Home },
                    { id: 2, name: 'Location', icon: MapPin },
                    { id: 3, name: 'Property Details', icon: DollarSign },
                    { id: 4, name: 'Features & Amenities', icon: Home },
                    { id: 5, name: 'Photos', icon: Image },
                    { id: 6, name: 'Virtual Tour', icon: Video }
                  ].map(section => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center space-x-3 ${
                          activeSection === section.id
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{section.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                
                {/* Section 1: Basic Information */}
                {activeSection === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
                      <p className="text-gray-600">Provide the core details about your property listing</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Property Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={listingFormData.title}
                          onChange={(e) => updateFormField('title', e.target.value)}
                          placeholder="e.g., Stunning 3-Bedroom Home with Pool"
                          maxLength={200}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          } focus:ring-4 focus:ring-blue-100 transition-all`}
                        />
                        <div className="flex justify-between mt-1">
                          {validationErrors.title && (
                            <p className="text-sm text-red-600">{validationErrors.title}</p>
                          )}
                          <p className="text-xs text-gray-500 ml-auto">{listingFormData.title.length} / 200</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Property Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={listingFormData.description}
                          onChange={(e) => updateFormField('description', e.target.value)}
                          placeholder="Describe the property's best features, condition, location benefits, and what makes it special..."
                          rows={8}
                          maxLength={5000}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          } focus:ring-4 focus:ring-blue-100 transition-all`}
                        />
                        <div className="flex justify-between mt-1">
                          {validationErrors.description && (
                            <p className="text-sm text-red-600">{validationErrors.description}</p>
                          )}
                          <p className="text-xs text-gray-500 ml-auto">{listingFormData.description.length} / 5000</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Listing Type <span className="text-red-500">*</span>
                          </label>
                          <div className="flex space-x-4">
                            {(['sale', 'rent'] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => updateFormField('listing_type', type)}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                  listingFormData.listing_type === type
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {type === 'sale' ? 'For Sale' : 'For Rent'}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Property Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={listingFormData.property_type}
                            onChange={(e) => updateFormField('property_type', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          >
                            <option value="house">House</option>
                            <option value="condo">Condo</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="apartment">Apartment</option>
                            <option value="land">Land</option>
                            <option value="commercial">Commercial</option>
                          </select>
                        </div>
                      </div>
                      
                      {listingFormData.listing_type === 'rent' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Rent Frequency
                          </label>
                          <select
                            value={listingFormData.rent_frequency || 'monthly'}
                            onChange={(e) => updateFormField('rent_frequency', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="weekly">Weekly</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(2)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Location
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Section 2: Location */}
                {activeSection === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Location</h2>
                      <p className="text-gray-600">Specify where the property is located</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Street Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={listingFormData.address_street}
                          onChange={(e) => updateFormField('address_street', e.target.value)}
                          onBlur={handleGeocode}
                          placeholder="123 Main Street"
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.address_street ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          } focus:ring-4 focus:ring-blue-100 transition-all`}
                        />
                        {validationErrors.address_street && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.address_street}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit / Apartment Number
                        </label>
                        <input
                          type="text"
                          value={listingFormData.address_unit}
                          onChange={(e) => updateFormField('address_unit', e.target.value)}
                          placeholder="Unit 2B (optional)"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={listingFormData.address_city}
                            onChange={(e) => updateFormField('address_city', e.target.value)}
                            onBlur={handleGeocode}
                            placeholder="Miami"
                            className={`w-full px-4 py-3 rounded-lg border-2 ${
                              validationErrors.address_city ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                            } focus:ring-4 focus:ring-blue-100 transition-all`}
                          />
                          {validationErrors.address_city && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.address_city}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={listingFormData.address_state}
                            onChange={(e) => updateFormField('address_state', e.target.value.toUpperCase().slice(0, 2))}
                            onBlur={handleGeocode}
                            placeholder="FL"
                            maxLength={2}
                            className={`w-full px-4 py-3 rounded-lg border-2 ${
                              validationErrors.address_state ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                            } focus:ring-4 focus:ring-blue-100 transition-all uppercase`}
                          />
                          {validationErrors.address_state && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.address_state}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ZIP Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={listingFormData.address_zip}
                            onChange={(e) => updateFormField('address_zip', e.target.value)}
                            onBlur={handleGeocode}
                            placeholder="33139"
                            maxLength={10}
                            className={`w-full px-4 py-3 rounded-lg border-2 ${
                              validationErrors.address_zip ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                            } focus:ring-4 focus:ring-blue-100 transition-all`}
                          />
                          {validationErrors.address_zip && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.address_zip}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Neighborhood
                          </label>
                          <input
                            type="text"
                            value={listingFormData.neighborhood}
                            onChange={(e) => updateFormField('neighborhood', e.target.value)}
                            placeholder="e.g., Downtown, Coral Gables"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>
                      
                      {/* Map Preview */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Location Preview
                        </label>
                        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center border-2 border-gray-200">
                          {mapPreview.geocoding_loading ? (
                            <div className="text-center">
                              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-sm text-gray-600">Verifying address...</p>
                            </div>
                          ) : mapPreview.pin_position ? (
                            <div className="text-center">
                              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-gray-900">Location Verified</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {mapPreview.pin_position.lat.toFixed(6)}, {mapPreview.pin_position.lng.toFixed(6)}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center text-gray-400">
                              <MapPin className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-sm">Enter address to preview location</p>
                            </div>
                          )}
                        </div>
                        {listingFormData.address_street && listingFormData.address_city && listingFormData.address_state && (
                          <button
                            type="button"
                            onClick={handleGeocode}
                            disabled={mapPreview.geocoding_loading}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                          >
                            Verify Location on Map
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(1)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection(3)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Details
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Section 3: Property Details */}
                {activeSection === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Details</h2>
                      <p className="text-gray-600">Specify the property's key specifications</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={listingFormData.price || ''}
                            onChange={(e) => updateFormField('price', e.target.value ? Number(e.target.value) : null)}
                            placeholder="450000"
                            min="0"
                            step="1000"
                            className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                              validationErrors.price ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                            } focus:ring-4 focus:ring-blue-100 transition-all`}
                          />
                        </div>
                        {validationErrors.price && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.price}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Bedrooms <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={listingFormData.bedrooms || ''}
                            onChange={(e) => updateFormField('bedrooms', e.target.value ? Number(e.target.value) : null)}
                            placeholder="3"
                            min="0"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Bathrooms <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={listingFormData.bathrooms || ''}
                            onChange={(e) => updateFormField('bathrooms', e.target.value ? Number(e.target.value) : null)}
                            placeholder="2.5"
                            min="0"
                            step="0.5"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Square Footage <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={listingFormData.square_footage || ''}
                            onChange={(e) => updateFormField('square_footage', e.target.value ? Number(e.target.value) : null)}
                            placeholder="2200"
                            min="0"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>
                      
                      {calculatePricePerSqft() && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-900">
                            <span className="font-semibold">Price per sqft:</span> ${calculatePricePerSqft()?.toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Lot Size
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              value={listingFormData.lot_size || ''}
                              onChange={(e) => updateFormField('lot_size', e.target.value ? Number(e.target.value) : null)}
                              placeholder="5500"
                              min="0"
                              className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                            <select
                              value={listingFormData.lot_size_unit || 'sqft'}
                              onChange={(e) => updateFormField('lot_size_unit', e.target.value)}
                              className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                              <option value="sqft">sqft</option>
                              <option value="acres">acres</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Year Built
                          </label>
                          <input
                            type="number"
                            value={listingFormData.year_built || ''}
                            onChange={(e) => updateFormField('year_built', e.target.value ? Number(e.target.value) : null)}
                            placeholder="2005"
                            min="1800"
                            max={new Date().getFullYear()}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Parking Spaces
                          </label>
                          <input
                            type="number"
                            value={listingFormData.parking_spaces || ''}
                            onChange={(e) => updateFormField('parking_spaces', e.target.value ? Number(e.target.value) : null)}
                            placeholder="2"
                            min="0"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            HOA Fee
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={listingFormData.hoa_fee || ''}
                                onChange={(e) => updateFormField('hoa_fee', e.target.value ? Number(e.target.value) : null)}
                                placeholder="250"
                                min="0"
                                className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                              />
                            </div>
                            <select
                              value={listingFormData.hoa_frequency || 'monthly'}
                              onChange={(e) => updateFormField('hoa_frequency', e.target.value)}
                              className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="annually">Annually</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(2)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection(4)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Features
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Section 4: Features & Amenities */}
                {activeSection === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Features & Amenities</h2>
                      <p className="text-gray-600">Select all that apply to this property</p>
                    </div>
                    
                    <div className="space-y-8">
                      {/* Interior Features */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interior Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['Hardwood Floors', 'Carpet', 'Tile Floors', 'Granite Countertops', 'Marble Countertops', 'Updated Kitchen', 'Stainless Steel Appliances', 'Walk-in Closets', 'High Ceilings', 'Fireplace', 'Finished Basement', 'Attic'].map(feature => (
                            <button
                              key={feature}
                              type="button"
                              onClick={() => toggleFeature('interior_features', feature)}
                              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                                listingFormData.interior_features.includes(feature)
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {listingFormData.interior_features.includes(feature) && (
                                <Check className="h-4 w-4 inline mr-2" />
                              )}
                              {feature}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Exterior Features */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exterior Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['Pool', 'Hot Tub/Spa', 'Garden', 'Yard', 'Patio', 'Deck', 'Balcony', 'Garage', 'Carport', 'Fencing', 'Sprinkler System'].map(feature => (
                            <button
                              key={feature}
                              type="button"
                              onClick={() => toggleFeature('exterior_features', feature)}
                              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                                listingFormData.exterior_features.includes(feature)
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {listingFormData.exterior_features.includes(feature) && (
                                <Check className="h-4 w-4 inline mr-2" />
                              )}
                              {feature}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Appliances */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appliances Included</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['Refrigerator', 'Dishwasher', 'Microwave', 'Oven/Range', 'Washer', 'Dryer'].map(appliance => (
                            <button
                              key={appliance}
                              type="button"
                              onClick={() => toggleFeature('appliances_included', appliance)}
                              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                                listingFormData.appliances_included.includes(appliance)
                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {listingFormData.appliances_included.includes(appliance) && (
                                <Check className="h-4 w-4 inline mr-2" />
                              )}
                              {appliance}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Boolean Features */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: 'furnished', label: 'Furnished' },
                            { key: 'pet_friendly', label: 'Pet Friendly' },
                            { key: 'new_construction', label: 'New Construction' },
                            { key: 'recently_renovated', label: 'Recently Renovated' }
                          ].map(feature => (
                            <label key={feature.key} className="flex items-center space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:bg-gray-50 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={listingFormData[feature.key as keyof ListingFormData] as boolean}
                                onChange={(e) => updateFormField(feature.key as keyof ListingFormData, e.target.checked)}
                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-offset-0"
                              />
                              <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Property Highlights */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Property Highlights</h3>
                          <button
                            type="button"
                            onClick={addHighlight}
                            disabled={listingFormData.highlights.length >= 10}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            + Add Highlight
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Add up to 10 key selling points (max 100 characters each)</p>
                        
                        <div className="space-y-3">
                          {listingFormData.highlights.map((highlight, index) => (
                            <div key={index} className="flex space-x-2">
                              <input
                                type="text"
                                value={highlight}
                                onChange={(e) => updateHighlight(index, e.target.value)}
                                placeholder="e.g., Walking distance to top-rated schools"
                                maxLength={100}
                                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => removeHighlight(index)}
                                className="px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                          
                          {listingFormData.highlights.length === 0 && (
                            <p className="text-sm text-gray-500 italic">No highlights added yet. Click "+ Add Highlight" to start.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(3)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection(5)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Photos
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Section 5: Photos */}
                {activeSection === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Photos</h2>
                      <p className="text-gray-600">Upload high-quality images of your property (minimum 1, maximum 50)</p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Upload Area */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files) {
                            handleFileSelect(e.dataTransfer.files);
                          }
                        }}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">Drag and drop photos here</p>
                        <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                        <p className="text-xs text-gray-400">JPG, PNG (max 10MB each) • {photosState.uploaded_photos.length} / {photosState.max_photos} photos</p>
                        <input
                          id="photo-upload"
                          type="file"
                          multiple
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                          className="hidden"
                        />
                      </div>
                      
                      {validationErrors.photos && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                          <p className="text-sm">{validationErrors.photos}</p>
                        </div>
                      )}
                      
                      {/* Photo Gallery */}
                      {photosState.uploaded_photos.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Uploaded Photos</h3>
                            <p className="text-sm text-gray-600">The first photo will be the main listing image</p>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photosState.uploaded_photos.map((photo, index) => (
                              <div key={photo.photo_id} className="relative group">
                                <div className={`aspect-[4/3] rounded-lg overflow-hidden border-2 ${
                                  photo.is_primary ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                                }`}>
                                  {photo.preview_url && (
                                    <img
                                      src={photo.preview_url}
                                      alt={`Upload ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  
                                  {photo.uploading && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                      <div className="text-center">
                                        <svg className="animate-spin h-8 w-8 text-white mx-auto mb-2" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="text-white text-xs">{photo.upload_progress}%</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {photo.upload_error && (
                                    <div className="absolute inset-0 bg-red-50 flex items-center justify-center p-2">
                                      <p className="text-xs text-red-600 text-center">{photo.upload_error}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {photo.is_primary && (
                                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                                    PRIMARY
                                  </div>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => removePhoto(photo.photo_id)}
                                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => reorderPhotos(index, index - 1)}
                                    className="absolute bottom-2 left-2 bg-white text-gray-700 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-gray-50"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(4)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection(6)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Virtual Tour
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Section 6: Virtual Tour */}
                {activeSection === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Virtual Tour & Video</h2>
                      <p className="text-gray-600">Add optional video tours and 3D walkthroughs</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          YouTube Video URL
                        </label>
                        <input
                          type="url"
                          value={listingFormData.youtube_video_url}
                          onChange={(e) => updateFormField('youtube_video_url', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Add a video tour of the property</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          3D Virtual Tour URL
                        </label>
                        <input
                          type="url"
                          value={listingFormData.virtual_tour_url}
                          onChange={(e) => updateFormField('virtual_tour_url', e.target.value)}
                          placeholder="https://my.matterport.com/show/?m=..."
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Matterport or other 3D tour link</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveSection(5)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave('publish')}
                        disabled={submitting}
                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {submitting && saveMode === 'publish' ? (
                          <span className="flex items-center space-x-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Publishing...</span>
                          </span>
                        ) : (
                          'Publish Listing'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Action Bar (Mobile Sticky) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave('publish')}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Publish
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CreateListing;