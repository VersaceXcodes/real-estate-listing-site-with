import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Home, Search, MapPin, TrendingUp, ArrowRight } from 'lucide-react';

// Type definitions based on propertySchema
interface Property {
  property_id: string;
  title: string;
  price: number;
  currency: string;
  listing_type: 'sale' | 'rent';
  address_city: string;
  address_state: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  primary_photo: {
    image_url: string;
    thumbnail_url: string | null;
  } | null;
}

interface SuggestedPropertiesResponse {
  data: Property[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

const UV_404: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Global state - CRITICAL: Individual selectors only
  
  // Parse URL parameters for error context
  const urlParams = new URLSearchParams(location.search);
  const attemptedPath = urlParams.get('attempted_path') || location.pathname;
  const errorType = urlParams.get('error_type') || 'page_not_found';
  
  // Error context state
  const [errorContext] = useState(() => {
    const isPropertyNotFound = attemptedPath.includes('/property/');
    const isAgentNotFound = attemptedPath.includes('/agent/');
    
    let suggestedMessage = 'The page you are looking for does not exist.';
    
    if (isPropertyNotFound) {
      suggestedMessage = 'This property listing may have been removed or does not exist.';
    } else if (isAgentNotFound) {
      suggestedMessage = 'This agent profile is not available or has been deactivated.';
    }
    
    return {
      error_type: errorType,
      attempted_path: attemptedPath,
      is_property_not_found: isPropertyNotFound,
      is_agent_not_found: isAgentNotFound,
      suggested_message: suggestedMessage,
    };
  });
  
  // Quick search form state
  const [quickSearchForm, setQuickSearchForm] = useState({
    location: '',
    listing_type: 'sale' as 'sale' | 'rent',
    min_price: null as number | null,
    max_price: null as number | null,
    validation_errors: {} as Record<string, string>,
  });
  
  // Popular links (static data)
  const popularLinks = {
    featured_locations: [
      { name: 'Miami', path: '/search?location=miami', property_count: 245 },
      { name: 'Orlando', path: '/search?location=orlando', property_count: 189 },
      { name: 'Tampa', path: '/search?location=tampa', property_count: 156 },
      { name: 'Jacksonville', path: '/search?location=jacksonville', property_count: 132 },
    ],
    quick_links: [
      { label: 'Browse All Properties', path: '/search', icon: 'search' },
      { label: 'Properties for Sale', path: '/search?listing_type=sale', icon: 'home' },
      { label: 'Rental Properties', path: '/search?listing_type=rent', icon: 'key' },
      { label: 'Find an Agent', path: '/agents', icon: 'user' },
    ],
  };
  
  // Load suggested properties using React Query
  const { data: suggestedProperties, isLoading: loadingSuggested } = useQuery<SuggestedPropertiesResponse>({
    queryKey: ['suggested-properties-404'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/properties`,
        {
          params: {
            is_featured: true,
            status: 'active',
            limit: 6,
            offset: 0,
            sort_by: 'view_count',
            sort_order: 'desc',
          },
        }
      );
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setQuickSearchForm(prev => ({ ...prev, validation_errors: {} }));
    
    // Validate price range
    if (quickSearchForm.min_price && quickSearchForm.max_price && quickSearchForm.max_price < quickSearchForm.min_price) {
      setQuickSearchForm(prev => ({
        ...prev,
        validation_errors: { price_range: 'Maximum price must be greater than minimum price' },
      }));
      return;
    }
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (quickSearchForm.location) queryParams.set('location', quickSearchForm.location);
    if (quickSearchForm.min_price) queryParams.set('min_price', String(quickSearchForm.min_price));
    if (quickSearchForm.max_price) queryParams.set('max_price', String(quickSearchForm.max_price));
    queryParams.set('listing_type', quickSearchForm.listing_type);
    
    // Navigate to search results
    navigate(`/search?${queryParams.toString()}`);
  };
  
  // Format price for display
  const formatPrice = (price: number, currency: string, listingType: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
    
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };

  return (
    <>
      {/* Main 404 Content */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section with Error Message */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center">
              {/* Large 404 Illustration */}
              <div className="mb-8">
                <svg
                  className="mx-auto h-48 w-48 text-blue-600 opacity-20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={0.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              
              {/* 404 Heading */}
              <h1 className="text-9xl font-extrabold text-gray-900 tracking-tight mb-4">
                404
              </h1>
              
              {/* Error Message */}
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {errorContext.is_property_not_found && 'Property Not Found'}
                {errorContext.is_agent_not_found && 'Agent Profile Not Available'}
                {!errorContext.is_property_not_found && !errorContext.is_agent_not_found && 'Page Not Found'}
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                {errorContext.suggested_message}
              </p>
              
              {/* Attempted Path Display */}
              {attemptedPath && attemptedPath !== '/' && (
                <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 mb-8">
                  <p className="text-sm text-gray-500">
                    Attempted to access: <code className="text-blue-600 font-mono">{attemptedPath}</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Search Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Search for Properties Instead
            </h3>
            
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              {/* Location Input */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="location"
                    type="text"
                    value={quickSearchForm.location}
                    onChange={(e) => {
                      setQuickSearchForm(prev => ({ ...prev, location: e.target.value, validation_errors: {} }));
                    }}
                    placeholder="Enter city, neighborhood, or ZIP code"
                    className="block w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Listing Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Type
                </label>
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuickSearchForm(prev => ({ ...prev, listing_type: 'sale' }))}
                    className={`flex-1 px-6 py-3 font-medium transition-all duration-200 ${
                      quickSearchForm.listing_type === 'sale'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    For Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSearchForm(prev => ({ ...prev, listing_type: 'rent' }))}
                    className={`flex-1 px-6 py-3 font-medium transition-all duration-200 ${
                      quickSearchForm.listing_type === 'rent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    For Rent
                  </button>
                </div>
              </div>
              
              {/* Price Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min_price" className="block text-sm font-medium text-gray-700 mb-2">
                    Min Price
                  </label>
                  <input
                    id="min_price"
                    type="number"
                    value={quickSearchForm.min_price || ''}
                    onChange={(e) => {
                      setQuickSearchForm(prev => ({
                        ...prev,
                        min_price: e.target.value ? Number(e.target.value) : null,
                        validation_errors: {},
                      }));
                    }}
                    placeholder="No minimum"
                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label htmlFor="max_price" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Price
                  </label>
                  <input
                    id="max_price"
                    type="number"
                    value={quickSearchForm.max_price || ''}
                    onChange={(e) => {
                      setQuickSearchForm(prev => ({
                        ...prev,
                        max_price: e.target.value ? Number(e.target.value) : null,
                        validation_errors: {},
                      }));
                    }}
                    placeholder="No maximum"
                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Validation Error */}
              {quickSearchForm.validation_errors.price_range && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm text-red-700">{quickSearchForm.validation_errors.price_range}</p>
                </div>
              )}
              
              {/* Search Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Search className="h-5 w-5" />
                <span>Search Properties</span>
              </button>
            </form>
          </div>
        </div>
        
        {/* Suggested Properties Section */}
        {!loadingSuggested && suggestedProperties && suggestedProperties.data && suggestedProperties.data.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Explore Popular Properties
              </h3>
              <p className="text-gray-600 text-lg">
                Check out these featured listings while you're here
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedProperties.data.slice(0, 3).map((property) => (
                <Link
                  key={property.property_id}
                  to={`/property/${property.property_id}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
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
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Home className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Listing Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-md">
                        For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Property Details */}
                  <div className="p-6">
                    {/* Price */}
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      {formatPrice(property.price, property.currency, property.listing_type)}
                    </p>
                    
                    {/* Title */}
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {property.title}
                    </h4>
                    
                    {/* Location */}
                    <p className="text-sm text-gray-600 mb-4">
                      {property.address_city}, {property.address_state}
                    </p>
                    
                    {/* Specs */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {property.bedrooms} bd
                      </span>
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {property.bathrooms} ba
                      </span>
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        {property.square_footage.toLocaleString()} sqft
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* View More Button */}
            <div className="text-center mt-8">
              <Link
                to="/search"
                className="inline-flex items-center space-x-2 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all duration-200"
              >
                <span>Browse All Properties</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
        
        {/* Loading State for Suggested Properties */}
        {loadingSuggested && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Explore Popular Properties</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-8 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Popular Links Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Quick Links */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Quick Navigation
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/search"
                className="bg-white rounded-lg p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-500 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-600 transition-colors duration-200">
                    <Search className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Browse All Properties
                    </p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/search?listing_type=sale"
                className="bg-white rounded-lg p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-500 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-600 transition-colors duration-200">
                    <Home className="h-6 w-6 text-green-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Properties for Sale
                    </p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/search?listing_type=rent"
                className="bg-white rounded-lg p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-500 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-600 transition-colors duration-200">
                    <TrendingUp className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Rental Properties
                    </p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/"
                className="bg-white rounded-lg p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-500 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-600 transition-colors duration-200">
                    <Home className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Back to Homepage
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Featured Locations */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Popular Locations
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularLinks.featured_locations.map((location) => (
                <Link
                  key={location.name}
                  to={location.path}
                  className="bg-white rounded-lg p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-500 transition-all duration-200 text-center group"
                >
                  <div className="flex items-center justify-center mb-3">
                    <MapPin className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                  </div>
                  <p className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                    {location.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {location.property_count} properties
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        {/* Help Section */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Need Help?
              </h3>
              <p className="text-gray-600 mb-6">
                If you believe this is an error or need assistance, please contact our support team.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="h-5 w-5" />
                  <span>Go to Homepage</span>
                </Link>
                
                <Link
                  to="/search"
                  className="inline-flex items-center space-x-2 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all duration-200"
                >
                  <Search className="h-5 w-5" />
                  <span>Search Properties</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_404;