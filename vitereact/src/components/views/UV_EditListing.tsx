import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Upload, 
  GripVertical, 
  X, 
  Eye,
  History,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PropertyFormData {
  property_id: string;
  agent_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'rent';
  property_type: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land' | 'commercial';
  status: 'draft' | 'active' | 'pending' | 'sold' | 'rented' | 'inactive';
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
  hoa_fee: number | null;
  hoa_frequency: 'monthly' | 'quarterly' | 'annually' | null;
  property_tax: number | null;
  mls_number: string | null;
  interior_features: string[] | null;
  exterior_features: string[] | null;
  appliances_included: string[] | null;
  utilities_systems: string[] | null;
  amenities: string[] | null;
  highlights: string[] | null;
  furnished: boolean;
  pet_friendly: boolean;
  new_construction: boolean;
  recently_renovated: boolean;
  virtual_tour_available: boolean;
  youtube_video_url: string | null;
  virtual_tour_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PropertyPhoto {
  photo_id: string;
  image_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_primary: boolean;
  caption: string | null;
}

interface PriceChange {
  history_id: string;
  old_price: number;
  new_price: number;
  price_change_amount: number;
  price_change_percentage: number;
  changed_at: string;
}

interface StatusChange {
  history_id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_EditListing: React.FC = () => {
  const { property_id } = useParams<{ property_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors only
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const agentToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const isAgentAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_agent_authenticated);
  const showToast = useAppStore(state => state.show_toast);

  // Local state
  const [formData, setFormData] = useState<PropertyFormData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAgentAuthenticated || !currentAgent) {
      navigate('/agent/login?redirect=' + encodeURIComponent(`/agent/listings/edit/${property_id}`));
    }
  }, [isAgentAuthenticated, currentAgent, navigate, property_id]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Load property data
  const { data: propertyData, isLoading: loadingProperty, error: propertyError } = useQuery({
    queryKey: ['property', property_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!property_id && !!agentToken,
    staleTime: 60000,
    retry: 1
  });

  // Verify ownership and populate form
  useEffect(() => {
    if (propertyData) {
      // Ownership check
      if (propertyData.agent_id !== currentAgent?.agent_id) {
        showToast('You do not have permission to edit this listing', 'error');
        navigate('/agent/listings');
        return;
      }

      // Populate form
      setFormData({
        property_id: propertyData.property_id,
        agent_id: propertyData.agent_id,
        title: propertyData.title,
        description: propertyData.description,
        listing_type: propertyData.listing_type,
        property_type: propertyData.property_type,
        status: propertyData.status,
        price: Number(propertyData.price || 0),
        currency: propertyData.currency || 'USD',
        price_per_sqft: propertyData.price_per_sqft ? Number(propertyData.price_per_sqft) : null,
        rent_frequency: propertyData.rent_frequency,
        address_street: propertyData.address_street,
        address_unit: propertyData.address_unit,
        address_city: propertyData.address_city,
        address_state: propertyData.address_state,
        address_zip: propertyData.address_zip,
        address_country: propertyData.address_country || 'United States',
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        neighborhood: propertyData.neighborhood,
        bedrooms: Number(propertyData.bedrooms || 0),
        bathrooms: Number(propertyData.bathrooms || 0),
        square_footage: Number(propertyData.square_footage || 0),
        lot_size: propertyData.lot_size ? Number(propertyData.lot_size) : null,
        lot_size_unit: propertyData.lot_size_unit,
        year_built: propertyData.year_built ? Number(propertyData.year_built) : null,
        property_style: propertyData.property_style,
        floors: propertyData.floors ? Number(propertyData.floors) : null,
        parking_spaces: propertyData.parking_spaces ? Number(propertyData.parking_spaces) : null,
        hoa_fee: propertyData.hoa_fee ? Number(propertyData.hoa_fee) : null,
        hoa_frequency: propertyData.hoa_frequency,
        property_tax: propertyData.property_tax ? Number(propertyData.property_tax) : null,
        mls_number: propertyData.mls_number,
        interior_features: propertyData.interior_features || [],
        exterior_features: propertyData.exterior_features || [],
        appliances_included: propertyData.appliances_included || [],
        utilities_systems: propertyData.utilities_systems || [],
        amenities: propertyData.amenities || [],
        highlights: propertyData.highlights || [],
        furnished: propertyData.furnished || false,
        pet_friendly: propertyData.pet_friendly || false,
        new_construction: propertyData.new_construction || false,
        recently_renovated: propertyData.recently_renovated || false,
        virtual_tour_available: propertyData.virtual_tour_available || false,
        youtube_video_url: propertyData.youtube_video_url,
        virtual_tour_url: propertyData.virtual_tour_url,
        created_at: propertyData.created_at,
        updated_at: propertyData.updated_at
      });
    }
  }, [propertyData, currentAgent, navigate, showToast]);

  // Load property photos
  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ['property-photos', property_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos`,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data.data || [];
    },
    enabled: !!property_id && !!agentToken,
    select: (data) => data.sort((a: PropertyPhoto, b: PropertyPhoto) => a.display_order - b.display_order),
    staleTime: 60000,
    retry: 1
  });

  // Load price history
  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', property_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/price-history`,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data.data || [];
    },
    enabled: !!property_id && !!agentToken && showChangeHistory,
    staleTime: 300000,
    retry: 1
  });

  // Load status history
  const { data: statusHistory } = useQuery({
    queryKey: ['status-history', property_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/status-history`,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data.data || [];
    },
    enabled: !!property_id && !!agentToken && showChangeHistory,
    staleTime: 300000,
    retry: 1
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<PropertyFormData>) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property', property_id] });
      queryClient.invalidateQueries({ queryKey: ['price-history', property_id] });
      queryClient.invalidateQueries({ queryKey: ['status-history', property_id] });
      
      if (formData) {
        setFormData({ ...formData, updated_at: data.updated_at });
      }
      
      showToast('Listing updated successfully', 'success');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update listing';
      showToast(errorMsg, 'error');
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('photo_type', 'property');
      uploadFormData.append('agent_id', currentAgent?.agent_id || '');

      const uploadResponse = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/upload/photo`,
        uploadFormData,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );

      const photoResponse = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos`,
        {
          image_url: uploadResponse.data.image_url,
          thumbnail_url: uploadResponse.data.thumbnail_url,
          display_order: (photosData?.length || 0) + 1,
          is_primary: photosData?.length === 0
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );

      return photoResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-photos', property_id] });
      showToast('Photo uploaded successfully', 'success');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to upload photo';
      showToast(errorMsg, 'error');
    }
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photo_id: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos/${photo_id}`,
        {
          headers: {
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
      return photo_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-photos', property_id] });
      showToast('Photo deleted successfully', 'success');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete photo';
      showToast(errorMsg, 'error');
    }
  });

  // Reorder photos mutation
  const reorderPhotosMutation = useMutation({
    mutationFn: async (photoOrder: Array<{ photo_id: string; display_order: number }>) => {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties/${property_id}/photos/reorder`,
        { photo_order: photoOrder },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-photos', property_id] });
      showToast('Photos reordered successfully', 'success');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to reorder photos';
      showToast(errorMsg, 'error');
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFormChange = (field: keyof PropertyFormData, value: any) => {
    if (!formData) return;
    
    setFormData({ ...formData, [field]: value });
    
    // Clear field error on change
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    
    const errors: Record<string, string> = {};

    if (!formData.title || formData.title.length < 10) {
      errors.title = 'Title must be at least 10 characters';
    }
    if (formData.title && formData.title.length > 200) {
      errors.title = 'Title must not exceed 200 characters';
    }

    if (!formData.description || formData.description.length < 50) {
      errors.description = 'Description must be at least 50 characters';
    }
    if (formData.description && formData.description.length > 5000) {
      errors.description = 'Description must not exceed 5000 characters';
    }

    if (!formData.price || formData.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (!formData.address_street) {
      errors.address_street = 'Street address is required';
    }

    if (!formData.address_city) {
      errors.address_city = 'City is required';
    }

    if (!formData.bedrooms || formData.bedrooms < 0) {
      errors.bedrooms = 'Bedrooms must be 0 or greater';
    }

    if (!formData.bathrooms || formData.bathrooms <= 0) {
      errors.bathrooms = 'Bathrooms must be greater than 0';
    }

    if (!formData.square_footage || formData.square_footage <= 0) {
      errors.square_footage = 'Square footage must be greater than 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!validateForm() || !formData) return;

    try {
      await updatePropertyMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
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

    if (validFiles.length === 0) return;

    setUploadingPhotos(true);
    
    for (const file of validFiles) {
      try {
        await uploadPhotoMutation.mutateAsync(file);
      } catch (error) {
        console.error('Photo upload failed:', error);
      }
    }
    
    setUploadingPhotos(false);
  };

  const handleDeletePhoto = async (photo_id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await deletePhotoMutation.mutateAsync(photo_id);
    } catch (error) {
      console.error('Photo deletion failed:', error);
    }
  };

  const handlePhotoDragStart = (photo_id: string) => {
    setDraggedPhotoId(photo_id);
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePhotoDrop = async (targetPhotoId: string) => {
    if (!draggedPhotoId || !photosData) return;

    const photos = [...photosData];
    const draggedIndex = photos.findIndex(p => p.photo_id === draggedPhotoId);
    const targetIndex = photos.findIndex(p => p.photo_id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedPhoto] = photos.splice(draggedIndex, 1);
    photos.splice(targetIndex, 0, draggedPhoto);

    const reorderedPhotos = photos.map((photo, index) => ({
      photo_id: photo.photo_id,
      display_order: index + 1
    }));

    try {
      await reorderPhotosMutation.mutateAsync(reorderedPhotos);
    } catch (error) {
      console.error('Photo reorder failed:', error);
    }

    setDraggedPhotoId(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loadingProperty) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading property data...</p>
          </div>
        </div>
      </>
    );
  }

  if (propertyError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Property</h2>
            <p className="text-gray-600 mb-6">
              This property could not be loaded. It may not exist or you may not have permission to edit it.
            </p>
            <Link
              to="/agent/listings"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Listings
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!formData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link
                  to="/agent/listings"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Listings
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Created {formatDate(formData.created_at)} • Last updated {formatDate(formData.updated_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  to={`/property/${property_id}`}
                  target="_blank"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-200"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </Link>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={updatePropertyMutation.isPending || Object.keys(validationErrors).length > 0}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatePropertyMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                      Property Title *
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      placeholder="e.g., Stunning 3-Bedroom Home with Pool"
                      maxLength={200}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    />
                    {validationErrors.title && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.title}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">{formData.title.length} / 200 characters</p>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                      Property Description *
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Describe the property's best features, condition, and what makes it special..."
                      rows={8}
                      maxLength={5000}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    />
                    {validationErrors.description && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.description}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">{formData.description.length} / 5000 characters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="listing_type" className="block text-sm font-semibold text-gray-900 mb-2">
                        Listing Type *
                      </label>
                      <select
                        id="listing_type"
                        value={formData.listing_type}
                        onChange={(e) => handleFormChange('listing_type', e.target.value as 'sale' | 'rent')}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      >
                        <option value="sale">For Sale</option>
                        <option value="rent">For Rent</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="property_type" className="block text-sm font-semibold text-gray-900 mb-2">
                        Property Type *
                      </label>
                      <select
                        id="property_type"
                        value={formData.property_type}
                        onChange={(e) => handleFormChange('property_type', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      >
                        <option value="house">House</option>
                        <option value="condo">Condo</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="apartment">Apartment</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-2">
                        Listing Status *
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="sold">Sold</option>
                        <option value="rented">Rented</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="price" className="block text-sm font-semibold text-gray-900 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                          id="price"
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleFormChange('price', Number(e.target.value))}
                          placeholder="450000"
                          min="0"
                          step="1000"
                          className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                        />
                      </div>
                      {validationErrors.price && (
                        <p className="mt-2 text-sm text-red-600">{validationErrors.price}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Location</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label htmlFor="address_street" className="block text-sm font-semibold text-gray-900 mb-2">
                      Street Address *
                    </label>
                    <input
                      id="address_street"
                      type="text"
                      value={formData.address_street}
                      onChange={(e) => handleFormChange('address_street', e.target.value)}
                      placeholder="123 Main Street"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    />
                    {validationErrors.address_street && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.address_street}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="address_city" className="block text-sm font-semibold text-gray-900 mb-2">
                        City *
                      </label>
                      <input
                        id="address_city"
                        type="text"
                        value={formData.address_city}
                        onChange={(e) => handleFormChange('address_city', e.target.value)}
                        placeholder="Miami"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                      {validationErrors.address_city && (
                        <p className="mt-2 text-sm text-red-600">{validationErrors.address_city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="address_state" className="block text-sm font-semibold text-gray-900 mb-2">
                        State *
                      </label>
                      <input
                        id="address_state"
                        type="text"
                        value={formData.address_state}
                        onChange={(e) => handleFormChange('address_state', e.target.value.toUpperCase())}
                        placeholder="FL"
                        maxLength={2}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none uppercase"
                      />
                    </div>

                    <div>
                      <label htmlFor="address_zip" className="block text-sm font-semibold text-gray-900 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        id="address_zip"
                        type="text"
                        value={formData.address_zip}
                        onChange={(e) => handleFormChange('address_zip', e.target.value)}
                        placeholder="33139"
                        maxLength={10}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="neighborhood" className="block text-sm font-semibold text-gray-900 mb-2">
                      Neighborhood
                    </label>
                    <input
                      id="neighborhood"
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => handleFormChange('neighborhood', e.target.value || null)}
                      placeholder="e.g., Downtown, Coral Gables"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Property Details</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="bedrooms" className="block text-sm font-semibold text-gray-900 mb-2">
                        Bedrooms *
                      </label>
                      <input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => handleFormChange('bedrooms', Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                      {validationErrors.bedrooms && (
                        <p className="mt-2 text-sm text-red-600">{validationErrors.bedrooms}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="bathrooms" className="block text-sm font-semibold text-gray-900 mb-2">
                        Bathrooms *
                      </label>
                      <input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => handleFormChange('bathrooms', Number(e.target.value))}
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                      {validationErrors.bathrooms && (
                        <p className="mt-2 text-sm text-red-600">{validationErrors.bathrooms}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="square_footage" className="block text-sm font-semibold text-gray-900 mb-2">
                        Square Footage *
                      </label>
                      <input
                        id="square_footage"
                        type="number"
                        value={formData.square_footage}
                        onChange={(e) => handleFormChange('square_footage', Number(e.target.value))}
                        placeholder="2200"
                        min="0"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                      {validationErrors.square_footage && (
                        <p className="mt-2 text-sm text-red-600">{validationErrors.square_footage}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="year_built" className="block text-sm font-semibold text-gray-900 mb-2">
                        Year Built
                      </label>
                      <input
                        id="year_built"
                        type="number"
                        value={formData.year_built || ''}
                        onChange={(e) => handleFormChange('year_built', e.target.value ? Number(e.target.value) : null)}
                        placeholder="2005"
                        min="1800"
                        max={new Date().getFullYear()}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="parking_spaces" className="block text-sm font-semibold text-gray-900 mb-2">
                        Parking Spaces
                      </label>
                      <input
                        id="parking_spaces"
                        type="number"
                        value={formData.parking_spaces || ''}
                        onChange={(e) => handleFormChange('parking_spaces', e.target.value ? Number(e.target.value) : null)}
                        placeholder="2"
                        min="0"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.furnished}
                        onChange={(e) => handleFormChange('furnished', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">Furnished</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pet_friendly}
                        onChange={(e) => handleFormChange('pet_friendly', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">Pet Friendly</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.new_construction}
                        onChange={(e) => handleFormChange('new_construction', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">New Construction</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Photos Management */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Photos</h2>
                </div>
                <div className="p-6 space-y-6">
                  {loadingPhotos ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading photos...</p>
                    </div>
                  ) : (
                    <>
                      {/* Upload New Photos */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-4">
                          Add New Photos
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-2">
                            Drag and drop photos here or click to browse
                          </p>
                          <p className="text-xs text-gray-500 mb-4">
                            JPG, PNG (max 10MB each)
                          </p>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={(e) => handlePhotoUpload(e.target.files)}
                            disabled={uploadingPhotos}
                            className="hidden"
                            id="photo-upload"
                          />
                          <label
                            htmlFor="photo-upload"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {uploadingPhotos ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 mr-2" />
                                Select Photos
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Existing Photos Grid */}
                      {photosData && photosData.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-semibold text-gray-900">
                              Existing Photos ({photosData.length})
                            </label>
                            <p className="text-xs text-gray-500">
                              Drag to reorder • First photo is the primary image
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photosData.map((photo: PropertyPhoto, index: number) => (
                              <div
                                key={photo.photo_id}
                                draggable
                                onDragStart={() => handlePhotoDragStart(photo.photo_id)}
                                onDragOver={handlePhotoDragOver}
                                onDrop={() => handlePhotoDrop(photo.photo_id)}
                                className="relative group rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all cursor-move bg-white"
                              >
                                <img
                                  src={photo.thumbnail_url || photo.image_url}
                                  alt={photo.caption || `Property photo ${index + 1}`}
                                  className="w-full h-48 object-cover"
                                />
                                
                                {photo.is_primary && (
                                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-lg">
                                    Primary
                                  </div>
                                )}

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.photo_id)}
                                    disabled={deletePhotoMutation.isPending}
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors"
                                    aria-label="Delete photo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center text-white text-xs">
                                    <GripVertical className="w-4 h-4 mr-1" />
                                    <span>Order: {photo.display_order}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Features & Amenities */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Features & Amenities</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Property Highlights
                      </label>
                      <div className="space-y-2">
                        {(formData.highlights || []).map((highlight, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={highlight}
                              onChange={(e) => {
                                const newHighlights = [...(formData.highlights || [])];
                                newHighlights[index] = e.target.value;
                                handleFormChange('highlights', newHighlights);
                              }}
                              placeholder={`Highlight ${index + 1}`}
                              maxLength={100}
                              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newHighlights = (formData.highlights || []).filter((_, i) => i !== index);
                                handleFormChange('highlights', newHighlights);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        {(!formData.highlights || formData.highlights.length < 10) && (
                          <button
                            type="button"
                            onClick={() => {
                              const newHighlights = [...(formData.highlights || []), ''];
                              handleFormChange('highlights', newHighlights);
                            }}
                            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600 rounded-lg font-medium transition-colors"
                          >
                            + Add Highlight
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-4">
                      <label htmlFor="virtual_tour_url" className="block text-sm font-semibold text-gray-900 mb-2">
                        Virtual Tour URL
                      </label>
                      <input
                        id="virtual_tour_url"
                        type="url"
                        value={formData.virtual_tour_url || ''}
                        onChange={(e) => handleFormChange('virtual_tour_url', e.target.value || null)}
                        placeholder="https://my.matterport.com/show/?m=..."
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="youtube_video_url" className="block text-sm font-semibold text-gray-900 mb-2">
                        YouTube Video URL
                      </label>
                      <input
                        id="youtube_video_url"
                        type="url"
                        value={formData.youtube_video_url || ''}
                        onChange={(e) => handleFormChange('youtube_video_url', e.target.value || null)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={updatePropertyMutation.isPending || Object.keys(validationErrors).length > 0}
                    className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatePropertyMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>

                  <Link
                    to={`/property/${property_id}`}
                    target="_blank"
                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium border border-gray-300 transition-all duration-200"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Preview Public View
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowChangeHistory(!showChangeHistory)}
                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium border border-gray-300 transition-all duration-200"
                  >
                    <History className="w-5 h-5 mr-2" />
                    {showChangeHistory ? 'Hide' : 'Show'} Change History
                  </button>
                </div>
              </div>

              {/* Change History */}
              {showChangeHistory && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                    <h3 className="text-lg font-bold text-white">Change History</h3>
                  </div>
                  <div className="p-6">
                    {priceHistory && priceHistory.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Changes</h4>
                        <div className="space-y-2">
                          {priceHistory.map((change: PriceChange) => (
                            <div key={change.history_id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">
                                  <span className="line-through text-gray-500">{formatPrice(change.old_price)}</span>
                                  {' → '}
                                  <span className="font-semibold text-blue-600">{formatPrice(change.new_price)}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(change.changed_at)}
                                </p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                change.price_change_amount < 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {change.price_change_percentage > 0 ? '+' : ''}{change.price_change_percentage.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {statusHistory && statusHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Status Changes</h4>
                        <div className="space-y-2">
                          {statusHistory.map((change: StatusChange) => (
                            <div key={change.history_id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-900">
                                <span className="capitalize">{change.old_status.replace('_', ' ')}</span>
                                {' → '}
                                <span className="font-semibold capitalize">{change.new_status.replace('_', ' ')}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(change.changed_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!priceHistory || priceHistory.length === 0) && (!statusHistory || statusHistory.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No changes recorded yet
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Listing Stats */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">Listing Stats</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Views</span>
                    <span className="text-lg font-bold text-gray-900">{propertyData?.view_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Inquiries</span>
                    <span className="text-lg font-bold text-gray-900">{propertyData?.inquiry_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Times Favorited</span>
                    <span className="text-lg font-bold text-gray-900">{propertyData?.favorite_count || 0}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Success/Error Alert */}
          {updatePropertyMutation.isSuccess && (
            <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-5">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Changes saved successfully!</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_EditListing;