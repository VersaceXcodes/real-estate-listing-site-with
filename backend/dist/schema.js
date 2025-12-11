import { z } from 'zod';
// =============================================
// USERS SCHEMAS
// =============================================
export const userSchema = z.object({
    user_id: z.string(),
    email: z.string(),
    password_hash: z.string(),
    full_name: z.string(),
    phone_number: z.string().nullable(),
    email_verified: z.boolean(),
    email_verification_token: z.string().nullable(),
    password_reset_token: z.string().nullable(),
    password_reset_expires: z.string().nullable(),
    profile_photo_url: z.string().nullable(),
    location: z.string().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createUserInputSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(8).max(100),
    full_name: z.string().min(1).max(255),
    phone_number: z.string().max(20).nullable(),
    profile_photo_url: z.string().url().nullable(),
    location: z.string().max(255).nullable()
});
export const updateUserInputSchema = z.object({
    user_id: z.string(),
    email: z.string().email().min(1).max(255).optional(),
    full_name: z.string().min(1).max(255).optional(),
    phone_number: z.string().max(20).nullable().optional(),
    profile_photo_url: z.string().url().nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    email_verified: z.boolean().optional()
});
export const searchUserInputSchema = z.object({
    query: z.string().optional(),
    email_verified: z.coerce.boolean().optional(),
    location: z.string().optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'full_name', 'email']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// AGENTS SCHEMAS
// =============================================
export const agentSchema = z.object({
    agent_id: z.string(),
    email: z.string(),
    password_hash: z.string(),
    full_name: z.string(),
    phone_number: z.string(),
    license_number: z.string(),
    license_state: z.string(),
    agency_name: z.string(),
    office_address_street: z.string(),
    office_address_city: z.string(),
    office_address_state: z.string(),
    office_address_zip: z.string(),
    years_experience: z.string(),
    license_document_url: z.string().nullable(),
    profile_photo_url: z.string().nullable(),
    professional_title: z.string().nullable(),
    bio: z.string().nullable(),
    specializations: z.array(z.string()).nullable(),
    service_areas: z.array(z.string()).nullable(),
    languages_spoken: z.array(z.string()).nullable(),
    social_media_links: z.record(z.string()).nullable(),
    certifications: z.array(z.string()).nullable(),
    email_signature: z.string().nullable(),
    approved: z.boolean(),
    approval_status: z.enum(['pending', 'approved', 'rejected']),
    rejection_reason: z.string().nullable(),
    email_verified: z.boolean(),
    email_verification_token: z.string().nullable(),
    password_reset_token: z.string().nullable(),
    password_reset_expires: z.string().nullable(),
    account_status: z.enum(['active', 'inactive', 'suspended']),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createAgentInputSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(8).max(100),
    full_name: z.string().min(1).max(255),
    phone_number: z.string().min(1).max(20),
    license_number: z.string().min(1).max(100),
    license_state: z.string().min(2).max(2),
    agency_name: z.string().min(1).max(255),
    office_address_street: z.string().min(1).max(255),
    office_address_city: z.string().min(1).max(100),
    office_address_state: z.string().min(2).max(2),
    office_address_zip: z.string().min(5).max(10),
    years_experience: z.string().min(1).max(10),
    license_document_url: z.string().url().nullable(),
    profile_photo_url: z.string().url().nullable(),
    professional_title: z.string().max(100).nullable(),
    bio: z.string().max(2000).nullable(),
    specializations: z.array(z.string()).max(10).nullable(),
    service_areas: z.array(z.string()).max(20).nullable(),
    languages_spoken: z.array(z.string()).max(10).nullable(),
    social_media_links: z.record(z.string().url()).nullable(),
    certifications: z.array(z.string()).max(10).nullable(),
    email_signature: z.string().max(1000).nullable()
});
export const updateAgentInputSchema = z.object({
    agent_id: z.string(),
    email: z.string().email().min(1).max(255).optional(),
    full_name: z.string().min(1).max(255).optional(),
    phone_number: z.string().min(1).max(20).optional(),
    license_number: z.string().min(1).max(100).optional(),
    license_state: z.string().min(2).max(2).optional(),
    agency_name: z.string().min(1).max(255).optional(),
    office_address_street: z.string().min(1).max(255).optional(),
    office_address_city: z.string().min(1).max(100).optional(),
    office_address_state: z.string().min(2).max(2).optional(),
    office_address_zip: z.string().min(5).max(10).optional(),
    years_experience: z.string().min(1).max(10).optional(),
    license_document_url: z.string().url().nullable().optional(),
    profile_photo_url: z.string().url().nullable().optional(),
    professional_title: z.string().max(100).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    specializations: z.array(z.string()).max(10).nullable().optional(),
    service_areas: z.array(z.string()).max(20).nullable().optional(),
    languages_spoken: z.array(z.string()).max(10).nullable().optional(),
    social_media_links: z.record(z.string().url()).nullable().optional(),
    certifications: z.array(z.string()).max(10).nullable().optional(),
    email_signature: z.string().max(1000).nullable().optional(),
    approved: z.boolean().optional(),
    approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
    rejection_reason: z.string().max(500).nullable().optional(),
    account_status: z.enum(['active', 'inactive', 'suspended']).optional()
});
export const searchAgentInputSchema = z.object({
    query: z.string().optional(),
    approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
    account_status: z.enum(['active', 'inactive', 'suspended']).optional(),
    license_state: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    service_areas: z.array(z.string()).optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'full_name', 'agency_name']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// PROPERTIES SCHEMAS
// =============================================
export const propertySchema = z.object({
    property_id: z.string(),
    agent_id: z.string(),
    title: z.string(),
    description: z.string(),
    listing_type: z.enum(['sale', 'rent']),
    property_type: z.enum(['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial']),
    status: z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']),
    price: z.number(),
    currency: z.string(),
    price_per_sqft: z.number().nullable(),
    rent_frequency: z.enum(['monthly', 'weekly', 'daily']).nullable(),
    address_street: z.string(),
    address_unit: z.string().nullable(),
    address_city: z.string(),
    address_state: z.string(),
    address_zip: z.string(),
    address_country: z.string(),
    latitude: z.string().nullable(),
    longitude: z.string().nullable(),
    neighborhood: z.string().nullable(),
    bedrooms: z.number().int(),
    bathrooms: z.number(),
    square_footage: z.number().int(),
    lot_size: z.number().nullable(),
    lot_size_unit: z.enum(['sqft', 'acres']).nullable(),
    year_built: z.number().int().nullable(),
    property_style: z.string().nullable(),
    floors: z.number().int().nullable(),
    parking_spaces: z.number().int().nullable(),
    parking_type: z.string().nullable(),
    hoa_fee: z.number().nullable(),
    hoa_frequency: z.enum(['monthly', 'quarterly', 'annually']).nullable(),
    property_tax: z.number().nullable(),
    mls_number: z.string().nullable(),
    interior_features: z.array(z.string()).nullable(),
    exterior_features: z.array(z.string()).nullable(),
    appliances_included: z.array(z.string()).nullable(),
    utilities_systems: z.array(z.string()).nullable(),
    security_features: z.array(z.string()).nullable(),
    community_amenities: z.array(z.string()).nullable(),
    amenities: z.array(z.string()).nullable(),
    additional_features: z.array(z.string()).nullable(),
    highlights: z.array(z.string()).nullable(),
    furnished: z.boolean(),
    pet_friendly: z.boolean(),
    new_construction: z.boolean(),
    recently_renovated: z.boolean(),
    virtual_tour_available: z.boolean(),
    open_house_scheduled: z.boolean(),
    price_reduced: z.boolean(),
    youtube_video_url: z.string().nullable(),
    virtual_tour_url: z.string().nullable(),
    view_count: z.number().int(),
    inquiry_count: z.number().int(),
    favorite_count: z.number().int(),
    is_featured: z.boolean(),
    featured_until: z.string().nullable(),
    featured_order: z.number().int().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
    published_at: z.string().nullable(),
    days_on_market: z.number().int().nullable()
});
export const createPropertyInputSchema = z.object({
    agent_id: z.string(),
    title: z.string().min(10).max(200),
    description: z.string().min(50).max(5000),
    listing_type: z.enum(['sale', 'rent']),
    property_type: z.enum(['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial']),
    status: z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']).default('draft'),
    price: z.number().positive(),
    currency: z.string().length(3).default('USD'),
    price_per_sqft: z.number().positive().nullable(),
    rent_frequency: z.enum(['monthly', 'weekly', 'daily']).nullable(),
    address_street: z.string().min(1).max(255),
    address_unit: z.string().max(50).nullable(),
    address_city: z.string().min(1).max(100),
    address_state: z.string().min(2).max(2),
    address_zip: z.string().min(5).max(10),
    address_country: z.string().default('United States'),
    latitude: z.string().nullable(),
    longitude: z.string().nullable(),
    neighborhood: z.string().max(100).nullable(),
    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.number().positive(),
    square_footage: z.number().int().positive(),
    lot_size: z.number().positive().nullable(),
    lot_size_unit: z.enum(['sqft', 'acres']).nullable(),
    year_built: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
    property_style: z.string().max(100).nullable(),
    floors: z.number().int().positive().nullable(),
    parking_spaces: z.number().int().nonnegative().nullable(),
    parking_type: z.string().max(100).nullable(),
    hoa_fee: z.number().nonnegative().nullable(),
    hoa_frequency: z.enum(['monthly', 'quarterly', 'annually']).nullable(),
    property_tax: z.number().nonnegative().nullable(),
    mls_number: z.string().max(100).nullable(),
    interior_features: z.array(z.string()).max(50).nullable(),
    exterior_features: z.array(z.string()).max(50).nullable(),
    appliances_included: z.array(z.string()).max(30).nullable(),
    utilities_systems: z.array(z.string()).max(20).nullable(),
    security_features: z.array(z.string()).max(20).nullable(),
    community_amenities: z.array(z.string()).max(30).nullable(),
    amenities: z.array(z.string()).max(50).nullable(),
    additional_features: z.array(z.string()).max(30).nullable(),
    highlights: z.array(z.string()).max(10).nullable(),
    furnished: z.boolean().default(false),
    pet_friendly: z.boolean().default(false),
    new_construction: z.boolean().default(false),
    recently_renovated: z.boolean().default(false),
    virtual_tour_available: z.boolean().default(false),
    open_house_scheduled: z.boolean().default(false),
    price_reduced: z.boolean().default(false),
    youtube_video_url: z.string().url().nullable(),
    virtual_tour_url: z.string().url().nullable()
});
export const updatePropertyInputSchema = z.object({
    property_id: z.string(),
    title: z.string().min(10).max(200).optional(),
    description: z.string().min(50).max(5000).optional(),
    listing_type: z.enum(['sale', 'rent']).optional(),
    property_type: z.enum(['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial']).optional(),
    status: z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']).optional(),
    price: z.number().positive().optional(),
    price_per_sqft: z.number().positive().nullable().optional(),
    rent_frequency: z.enum(['monthly', 'weekly', 'daily']).nullable().optional(),
    address_street: z.string().min(1).max(255).optional(),
    address_unit: z.string().max(50).nullable().optional(),
    address_city: z.string().min(1).max(100).optional(),
    address_state: z.string().min(2).max(2).optional(),
    address_zip: z.string().min(5).max(10).optional(),
    neighborhood: z.string().max(100).nullable().optional(),
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().positive().optional(),
    square_footage: z.number().int().positive().optional(),
    lot_size: z.number().positive().nullable().optional(),
    lot_size_unit: z.enum(['sqft', 'acres']).nullable().optional(),
    year_built: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
    property_style: z.string().max(100).nullable().optional(),
    floors: z.number().int().positive().nullable().optional(),
    parking_spaces: z.number().int().nonnegative().nullable().optional(),
    parking_type: z.string().max(100).nullable().optional(),
    hoa_fee: z.number().nonnegative().nullable().optional(),
    hoa_frequency: z.enum(['monthly', 'quarterly', 'annually']).nullable().optional(),
    property_tax: z.number().nonnegative().nullable().optional(),
    mls_number: z.string().max(100).nullable().optional(),
    interior_features: z.array(z.string()).max(50).nullable().optional(),
    exterior_features: z.array(z.string()).max(50).nullable().optional(),
    appliances_included: z.array(z.string()).max(30).nullable().optional(),
    utilities_systems: z.array(z.string()).max(20).nullable().optional(),
    security_features: z.array(z.string()).max(20).nullable().optional(),
    community_amenities: z.array(z.string()).max(30).nullable().optional(),
    amenities: z.array(z.string()).max(50).nullable().optional(),
    additional_features: z.array(z.string()).max(30).nullable().optional(),
    highlights: z.array(z.string()).max(10).nullable().optional(),
    furnished: z.boolean().optional(),
    pet_friendly: z.boolean().optional(),
    new_construction: z.boolean().optional(),
    recently_renovated: z.boolean().optional(),
    virtual_tour_available: z.boolean().optional(),
    open_house_scheduled: z.boolean().optional(),
    price_reduced: z.boolean().optional(),
    youtube_video_url: z.string().url().nullable().optional(),
    virtual_tour_url: z.string().url().nullable().optional(),
    is_featured: z.boolean().optional(),
    featured_until: z.string().nullable().optional(),
    featured_order: z.number().int().nullable().optional()
});
export const searchPropertyInputSchema = z.object({
    query: z.string().optional(),
    agent_id: z.string().optional(),
    listing_type: z.enum(['sale', 'rent']).optional(),
    property_type: z.array(z.enum(['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial'])).optional(),
    status: z.union([
        z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']),
        z.array(z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']))
    ]).optional().transform(val => val ? (Array.isArray(val) ? val : [val]) : undefined),
    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().positive().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    neighborhood: z.string().optional(),
    bedrooms: z.coerce.number().int().nonnegative().optional(),
    min_bedrooms: z.coerce.number().int().nonnegative().optional(),
    max_bedrooms: z.coerce.number().int().positive().optional(),
    bathrooms: z.coerce.number().nonnegative().optional(),
    min_bathrooms: z.coerce.number().nonnegative().optional(),
    max_bathrooms: z.coerce.number().positive().optional(),
    min_sqft: z.coerce.number().int().positive().optional(),
    max_sqft: z.coerce.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    furnished: z.coerce.boolean().optional(),
    pet_friendly: z.coerce.boolean().optional(),
    new_construction: z.coerce.boolean().optional(),
    recently_renovated: z.coerce.boolean().optional(),
    virtual_tour_available: z.coerce.boolean().optional(),
    is_featured: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['price', 'created_at', 'updated_at', 'bedrooms', 'square_footage', 'view_count', 'featured_order']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// PROPERTY PHOTOS SCHEMAS
// =============================================
export const propertyPhotoSchema = z.object({
    photo_id: z.string(),
    property_id: z.string(),
    image_url: z.string(),
    thumbnail_url: z.string().nullable(),
    display_order: z.number().int(),
    is_primary: z.boolean(),
    caption: z.string().nullable(),
    file_size: z.number().int().nullable(),
    created_at: z.coerce.date()
});
export const createPropertyPhotoInputSchema = z.object({
    property_id: z.string(),
    image_url: z.string().url(),
    thumbnail_url: z.string().url().nullable(),
    display_order: z.number().int().nonnegative(),
    is_primary: z.boolean().default(false),
    caption: z.string().max(500).nullable(),
    file_size: z.number().int().positive().nullable()
});
export const updatePropertyPhotoInputSchema = z.object({
    photo_id: z.string(),
    display_order: z.number().int().nonnegative().optional(),
    is_primary: z.boolean().optional(),
    caption: z.string().max(500).nullable().optional()
});
export const searchPropertyPhotoInputSchema = z.object({
    property_id: z.string(),
    is_primary: z.boolean().optional(),
    sort_by: z.enum(['display_order', 'created_at']).default('display_order'),
    sort_order: z.enum(['asc', 'desc']).default('asc')
});
// =============================================
// INQUIRIES SCHEMAS
// =============================================
export const inquirySchema = z.object({
    inquiry_id: z.string(),
    property_id: z.string(),
    agent_id: z.string(),
    user_id: z.string().nullable(),
    inquirer_name: z.string(),
    inquirer_email: z.string(),
    inquirer_phone: z.string().nullable(),
    message: z.string(),
    viewing_requested: z.boolean(),
    preferred_viewing_date: z.string().nullable(),
    preferred_viewing_time: z.string().nullable(),
    status: z.enum(['new', 'responded', 'scheduled', 'completed', 'closed']),
    agent_read: z.boolean(),
    agent_read_at: z.string().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createInquiryInputSchema = z.object({
    property_id: z.string(),
    agent_id: z.string(),
    user_id: z.string().nullable(),
    inquirer_name: z.string().min(1).max(255),
    inquirer_email: z.string().email(),
    inquirer_phone: z.string().max(20).nullable(),
    message: z.string().min(10).max(2000),
    viewing_requested: z.boolean().default(false),
    preferred_viewing_date: z.string().nullable(),
    preferred_viewing_time: z.string().nullable()
});
export const updateInquiryInputSchema = z.object({
    inquiry_id: z.string(),
    status: z.enum(['new', 'responded', 'scheduled', 'completed', 'closed']).optional(),
    agent_read: z.boolean().optional(),
    viewing_requested: z.boolean().optional(),
    preferred_viewing_date: z.string().nullable().optional(),
    preferred_viewing_time: z.string().nullable().optional()
});
export const searchInquiryInputSchema = z.object({
    property_id: z.string().optional(),
    agent_id: z.string().optional(),
    user_id: z.string().optional(),
    status: z.array(z.enum(['new', 'responded', 'scheduled', 'completed', 'closed'])).optional(),
    agent_read: z.coerce.boolean().optional(),
    viewing_requested: z.coerce.boolean().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'updated_at', 'status']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// INQUIRY REPLIES SCHEMAS
// =============================================
export const inquiryReplySchema = z.object({
    reply_id: z.string(),
    inquiry_id: z.string(),
    sender_type: z.enum(['agent', 'user']),
    sender_id: z.string(),
    message: z.string(),
    include_signature: z.boolean(),
    created_at: z.coerce.date()
});
export const createInquiryReplyInputSchema = z.object({
    inquiry_id: z.string(),
    sender_type: z.enum(['agent', 'user']),
    sender_id: z.string(),
    message: z.string().min(1).max(5000),
    include_signature: z.boolean().default(true)
});
export const searchInquiryReplyInputSchema = z.object({
    inquiry_id: z.string(),
    sender_type: z.enum(['agent', 'user']).optional(),
    sort_by: z.enum(['created_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('asc')
});
// =============================================
// FAVORITES SCHEMAS
// =============================================
export const favoriteSchema = z.object({
    favorite_id: z.string(),
    user_id: z.string(),
    property_id: z.string(),
    created_at: z.coerce.date()
});
export const createFavoriteInputSchema = z.object({
    user_id: z.string(),
    property_id: z.string()
});
export const searchFavoriteInputSchema = z.object({
    user_id: z.string().optional(),
    property_id: z.string().optional(),
    limit: z.coerce.number().int().positive().default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// PROPERTY VIEWS SCHEMAS
// =============================================
export const propertyViewSchema = z.object({
    view_id: z.string(),
    property_id: z.string(),
    user_id: z.string().nullable(),
    session_id: z.string().nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    referrer: z.string().nullable(),
    viewed_at: z.string()
});
export const createPropertyViewInputSchema = z.object({
    property_id: z.string(),
    user_id: z.string().nullable(),
    session_id: z.string().nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    referrer: z.string().nullable()
});
export const searchPropertyViewInputSchema = z.object({
    property_id: z.string().optional(),
    user_id: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.coerce.number().int().positive().default(100),
    offset: z.coerce.number().int().nonnegative().default(0)
});
// =============================================
// PROPERTY REPORTS SCHEMAS
// =============================================
export const propertyReportSchema = z.object({
    report_id: z.string(),
    property_id: z.string(),
    reporter_user_id: z.string().nullable(),
    reporter_email: z.string().nullable(),
    reason: z.string(),
    details: z.string().nullable(),
    status: z.enum(['pending', 'resolved', 'dismissed']),
    admin_notes: z.string().nullable(),
    resolved_by_admin_id: z.string().nullable(),
    resolved_at: z.string().nullable(),
    created_at: z.coerce.date()
});
export const createPropertyReportInputSchema = z.object({
    property_id: z.string(),
    reporter_user_id: z.string().nullable(),
    reporter_email: z.string().email().nullable(),
    reason: z.enum(['Incorrect Information', 'Suspicious Listing', 'Inappropriate Content', 'Spam', 'Other']),
    details: z.string().max(2000).nullable()
});
export const updatePropertyReportInputSchema = z.object({
    report_id: z.string(),
    status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
    admin_notes: z.string().max(1000).nullable().optional(),
    resolved_by_admin_id: z.string().optional()
});
export const searchPropertyReportInputSchema = z.object({
    property_id: z.string().optional(),
    status: z.array(z.enum(['pending', 'resolved', 'dismissed'])).optional(),
    reason: z.string().optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'status']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// USER NOTIFICATION PREFERENCES SCHEMAS
// =============================================
export const userNotificationPreferencesSchema = z.object({
    preference_id: z.string(),
    user_id: z.string(),
    saved_property_price_change: z.boolean(),
    saved_property_status_change: z.boolean(),
    new_matching_properties: z.boolean(),
    agent_reply_received: z.boolean(),
    platform_updates: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createUserNotificationPreferencesInputSchema = z.object({
    user_id: z.string(),
    saved_property_price_change: z.boolean().default(true),
    saved_property_status_change: z.boolean().default(true),
    new_matching_properties: z.boolean().default(false),
    agent_reply_received: z.boolean().default(true),
    platform_updates: z.boolean().default(false)
});
export const updateUserNotificationPreferencesInputSchema = z.object({
    preference_id: z.string(),
    saved_property_price_change: z.boolean().optional(),
    saved_property_status_change: z.boolean().optional(),
    new_matching_properties: z.boolean().optional(),
    agent_reply_received: z.boolean().optional(),
    platform_updates: z.boolean().optional()
});
// =============================================
// AGENT NOTIFICATION PREFERENCES SCHEMAS
// =============================================
export const agentNotificationPreferencesSchema = z.object({
    preference_id: z.string(),
    agent_id: z.string(),
    new_inquiry_received: z.boolean(),
    inquirer_replied: z.boolean(),
    property_view_milestones: z.boolean(),
    monthly_report: z.boolean(),
    platform_updates: z.boolean(),
    notification_frequency: z.enum(['instant', 'daily', 'weekly']),
    browser_notifications_enabled: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createAgentNotificationPreferencesInputSchema = z.object({
    agent_id: z.string(),
    new_inquiry_received: z.boolean().default(true),
    inquirer_replied: z.boolean().default(true),
    property_view_milestones: z.boolean().default(true),
    monthly_report: z.boolean().default(true),
    platform_updates: z.boolean().default(false),
    notification_frequency: z.enum(['instant', 'daily', 'weekly']).default('instant'),
    browser_notifications_enabled: z.boolean().default(false)
});
export const updateAgentNotificationPreferencesInputSchema = z.object({
    preference_id: z.string(),
    new_inquiry_received: z.boolean().optional(),
    inquirer_replied: z.boolean().optional(),
    property_view_milestones: z.boolean().optional(),
    monthly_report: z.boolean().optional(),
    platform_updates: z.boolean().optional(),
    notification_frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    browser_notifications_enabled: z.boolean().optional()
});
// =============================================
// SAVED SEARCHES SCHEMAS
// =============================================
export const savedSearchSchema = z.object({
    saved_search_id: z.string(),
    user_id: z.string(),
    search_name: z.string(),
    location: z.string().nullable(),
    min_price: z.number().nullable(),
    max_price: z.number().nullable(),
    listing_type: z.string().nullable(),
    property_type: z.array(z.string()).nullable(),
    bedrooms: z.number().int().nullable(),
    bathrooms: z.number().nullable(),
    min_sqft: z.number().int().nullable(),
    max_sqft: z.number().int().nullable(),
    amenities: z.array(z.string()).nullable(),
    features: z.array(z.string()).nullable(),
    alert_frequency: z.enum(['instant', 'daily', 'weekly', 'never']),
    is_active: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createSavedSearchInputSchema = z.object({
    user_id: z.string(),
    search_name: z.string().min(1).max(100),
    location: z.string().max(255).nullable(),
    min_price: z.number().nonnegative().nullable(),
    max_price: z.number().positive().nullable(),
    listing_type: z.enum(['sale', 'rent']).nullable(),
    property_type: z.array(z.string()).nullable(),
    bedrooms: z.number().int().nonnegative().nullable(),
    bathrooms: z.number().nonnegative().nullable(),
    min_sqft: z.number().int().positive().nullable(),
    max_sqft: z.number().int().positive().nullable(),
    amenities: z.array(z.string()).nullable(),
    features: z.array(z.string()).nullable(),
    alert_frequency: z.enum(['instant', 'daily', 'weekly', 'never']).default('daily'),
    is_active: z.boolean().default(true)
});
export const updateSavedSearchInputSchema = z.object({
    saved_search_id: z.string(),
    search_name: z.string().min(1).max(100).optional(),
    location: z.string().max(255).nullable().optional(),
    min_price: z.number().nonnegative().nullable().optional(),
    max_price: z.number().positive().nullable().optional(),
    listing_type: z.enum(['sale', 'rent']).nullable().optional(),
    property_type: z.array(z.string()).nullable().optional(),
    bedrooms: z.number().int().nonnegative().nullable().optional(),
    bathrooms: z.number().nonnegative().nullable().optional(),
    min_sqft: z.number().int().positive().nullable().optional(),
    max_sqft: z.number().int().positive().nullable().optional(),
    amenities: z.array(z.string()).nullable().optional(),
    features: z.array(z.string()).nullable().optional(),
    alert_frequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
    is_active: z.boolean().optional()
});
export const searchSavedSearchInputSchema = z.object({
    user_id: z.string(),
    is_active: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().positive().default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'search_name']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// PROPERTY PRICE HISTORY SCHEMAS
// =============================================
export const propertyPriceHistorySchema = z.object({
    history_id: z.string(),
    property_id: z.string(),
    old_price: z.number(),
    new_price: z.number(),
    price_change_amount: z.number(),
    price_change_percentage: z.number(),
    changed_at: z.string()
});
export const createPropertyPriceHistoryInputSchema = z.object({
    property_id: z.string(),
    old_price: z.number().positive(),
    new_price: z.number().positive()
});
export const searchPropertyPriceHistoryInputSchema = z.object({
    property_id: z.string(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    sort_by: z.enum(['changed_at']).default('changed_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// PROPERTY STATUS HISTORY SCHEMAS
// =============================================
export const propertyStatusHistorySchema = z.object({
    history_id: z.string(),
    property_id: z.string(),
    old_status: z.string(),
    new_status: z.string(),
    changed_by_agent_id: z.string(),
    notes: z.string().nullable(),
    changed_at: z.string()
});
export const createPropertyStatusHistoryInputSchema = z.object({
    property_id: z.string(),
    old_status: z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']),
    new_status: z.enum(['draft', 'active', 'pending', 'sold', 'rented', 'inactive']),
    changed_by_agent_id: z.string(),
    notes: z.string().max(1000).nullable()
});
export const searchPropertyStatusHistoryInputSchema = z.object({
    property_id: z.string(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    sort_by: z.enum(['changed_at']).default('changed_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// SESSIONS SCHEMAS
// =============================================
export const agentSessionSchema = z.object({
    session_id: z.string(),
    agent_id: z.string(),
    token: z.string(),
    device_info: z.string().nullable(),
    browser_info: z.string().nullable(),
    ip_address: z.string().nullable(),
    last_active_at: z.string(),
    expires_at: z.string(),
    created_at: z.string()
});
export const userSessionSchema = z.object({
    session_id: z.string(),
    user_id: z.string(),
    token: z.string(),
    device_info: z.string().nullable(),
    browser_info: z.string().nullable(),
    ip_address: z.string().nullable(),
    last_active_at: z.string(),
    expires_at: z.string(),
    created_at: z.string()
});
export const createSessionInputSchema = z.object({
    device_info: z.string().max(500).nullable(),
    browser_info: z.string().max(500).nullable(),
    ip_address: z.string().max(45).nullable()
});
// =============================================
// ADMINS SCHEMAS
// =============================================
export const adminSchema = z.object({
    admin_id: z.string(),
    email: z.string(),
    password_hash: z.string(),
    full_name: z.string(),
    role: z.enum(['admin', 'moderator']),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date()
});
export const createAdminInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(100),
    full_name: z.string().min(1).max(255),
    role: z.enum(['admin', 'moderator']).default('moderator')
});
export const updateAdminInputSchema = z.object({
    admin_id: z.string(),
    email: z.string().email().optional(),
    full_name: z.string().min(1).max(255).optional(),
    role: z.enum(['admin', 'moderator']).optional()
});
// =============================================
// ANALYTICS SCHEMAS
// =============================================
export const agentAnalyticsDailySchema = z.object({
    analytics_id: z.string(),
    agent_id: z.string(),
    date: z.string(),
    total_views: z.number().int(),
    total_inquiries: z.number().int(),
    total_favorites: z.number().int(),
    active_listings_count: z.number().int(),
    properties_sold: z.number().int(),
    properties_rented: z.number().int(),
    created_at: z.string()
});
export const propertyAnalyticsDailySchema = z.object({
    analytics_id: z.string(),
    property_id: z.string(),
    date: z.string(),
    views: z.number().int(),
    inquiries: z.number().int(),
    favorites: z.number().int(),
    gallery_views: z.number().int(),
    map_interactions: z.number().int(),
    average_time_on_page: z.number().nullable(),
    created_at: z.string()
});
export const searchAgentAnalyticsInputSchema = z.object({
    agent_id: z.string(),
    date_from: z.string(),
    date_to: z.string(),
    sort_by: z.enum(['date']).default('date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
export const searchPropertyAnalyticsInputSchema = z.object({
    property_id: z.string(),
    date_from: z.string(),
    date_to: z.string(),
    sort_by: z.enum(['date']).default('date'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// EMAIL LOGS SCHEMAS
// =============================================
export const emailLogSchema = z.object({
    log_id: z.string(),
    recipient_email: z.string(),
    recipient_type: z.enum(['user', 'agent', 'admin']),
    recipient_id: z.string().nullable(),
    email_type: z.string(),
    subject: z.string(),
    template_name: z.string().nullable(),
    status: z.enum(['pending', 'delivered', 'bounced', 'failed']),
    sent_at: z.string().nullable(),
    opened_at: z.string().nullable(),
    clicked_at: z.string().nullable(),
    bounced_at: z.string().nullable(),
    error_message: z.string().nullable(),
    created_at: z.string()
});
export const createEmailLogInputSchema = z.object({
    recipient_email: z.string().email(),
    recipient_type: z.enum(['user', 'agent', 'admin']),
    recipient_id: z.string().nullable(),
    email_type: z.string(),
    subject: z.string().min(1).max(500),
    template_name: z.string().max(100).nullable()
});
export const updateEmailLogInputSchema = z.object({
    log_id: z.string(),
    status: z.enum(['pending', 'delivered', 'bounced', 'failed']).optional(),
    sent_at: z.string().optional(),
    opened_at: z.string().optional(),
    clicked_at: z.string().optional(),
    bounced_at: z.string().optional(),
    error_message: z.string().nullable().optional()
});
export const searchEmailLogInputSchema = z.object({
    recipient_email: z.string().optional(),
    recipient_type: z.enum(['user', 'agent', 'admin']).optional(),
    recipient_id: z.string().optional(),
    email_type: z.string().optional(),
    status: z.array(z.enum(['pending', 'delivered', 'bounced', 'failed'])).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.coerce.number().int().positive().default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'sent_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// OPEN HOUSES SCHEMAS
// =============================================
export const openHouseSchema = z.object({
    open_house_id: z.string(),
    property_id: z.string(),
    scheduled_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().nullable(),
    rsvp_count: z.number().int(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});
export const createOpenHouseInputSchema = z.object({
    property_id: z.string(),
    scheduled_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().max(1000).nullable(),
    is_active: z.boolean().default(true)
});
export const updateOpenHouseInputSchema = z.object({
    open_house_id: z.string(),
    scheduled_date: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    description: z.string().max(1000).nullable().optional(),
    is_active: z.boolean().optional()
});
export const searchOpenHouseInputSchema = z.object({
    property_id: z.string().optional(),
    is_active: z.coerce.boolean().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    limit: z.coerce.number().int().positive().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    sort_by: z.enum(['scheduled_date', 'created_at']).default('scheduled_date'),
    sort_order: z.enum(['asc', 'desc']).default('asc')
});
// =============================================
// OPEN HOUSE RSVPS SCHEMAS
// =============================================
export const openHouseRsvpSchema = z.object({
    rsvp_id: z.string(),
    open_house_id: z.string(),
    user_id: z.string().nullable(),
    guest_name: z.string(),
    guest_email: z.string(),
    guest_phone: z.string().nullable(),
    number_of_guests: z.number().int(),
    notes: z.string().nullable(),
    status: z.enum(['confirmed', 'cancelled', 'attended', 'no_show']),
    created_at: z.string()
});
export const createOpenHouseRsvpInputSchema = z.object({
    open_house_id: z.string(),
    user_id: z.string().nullable(),
    guest_name: z.string().min(1).max(255),
    guest_email: z.string().email(),
    guest_phone: z.string().max(20).nullable(),
    number_of_guests: z.number().int().positive().default(1),
    notes: z.string().max(500).nullable(),
    status: z.enum(['confirmed', 'cancelled', 'attended', 'no_show']).default('confirmed')
});
export const updateOpenHouseRsvpInputSchema = z.object({
    rsvp_id: z.string(),
    number_of_guests: z.number().int().positive().optional(),
    notes: z.string().max(500).nullable().optional(),
    status: z.enum(['confirmed', 'cancelled', 'attended', 'no_show']).optional()
});
export const searchOpenHouseRsvpInputSchema = z.object({
    open_house_id: z.string().optional(),
    user_id: z.string().optional(),
    status: z.array(z.enum(['confirmed', 'cancelled', 'attended', 'no_show'])).optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// LISTING NOTES SCHEMAS
// =============================================
export const listingNoteSchema = z.object({
    note_id: z.string(),
    property_id: z.string(),
    agent_id: z.string(),
    note_type: z.enum(['general', 'showing_feedback', 'offer', 'maintenance', 'price_strategy']),
    content: z.string(),
    is_private: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});
export const createListingNoteInputSchema = z.object({
    property_id: z.string(),
    agent_id: z.string(),
    note_type: z.enum(['general', 'showing_feedback', 'offer', 'maintenance', 'price_strategy']),
    content: z.string().min(1).max(5000),
    is_private: z.boolean().default(true)
});
export const updateListingNoteInputSchema = z.object({
    note_id: z.string(),
    note_type: z.enum(['general', 'showing_feedback', 'offer', 'maintenance', 'price_strategy']).optional(),
    content: z.string().min(1).max(5000).optional(),
    is_private: z.boolean().optional()
});
export const searchListingNoteInputSchema = z.object({
    property_id: z.string(),
    agent_id: z.string().optional(),
    note_type: z.enum(['general', 'showing_feedback', 'offer', 'maintenance', 'price_strategy']).optional(),
    is_private: z.boolean().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
    sort_by: z.enum(['created_at', 'updated_at']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc')
});
// =============================================
// AUTHENTICATION SCHEMAS
// =============================================
export const loginInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});
export const registerUserInputSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(8).max(100),
    full_name: z.string().min(1).max(255),
    phone_number: z.string().max(20).nullable().optional()
});
export const registerAgentInputSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(8).max(100),
    full_name: z.string().min(1).max(255),
    phone_number: z.string().min(1).max(20),
    license_number: z.string().min(1).max(100),
    license_state: z.string().min(2).max(2),
    agency_name: z.string().min(1).max(255),
    office_address_street: z.string().min(1).max(255),
    office_address_city: z.string().min(1).max(100),
    office_address_state: z.string().min(2).max(2),
    office_address_zip: z.string().min(5).max(10),
    years_experience: z.string().min(1).max(10)
});
export const changePasswordInputSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8).max(100)
});
export const resetPasswordInputSchema = z.object({
    token: z.string(),
    new_password: z.string().min(8).max(100)
});
export const verifyEmailInputSchema = z.object({
    token: z.string()
});
// =============================================
// RESPONSE SCHEMAS
// =============================================
export const paginatedResponseSchema = (itemSchema) => z.object({
    data: z.array(itemSchema),
    pagination: z.object({
        total: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        offset: z.number().int().nonnegative(),
        has_more: z.boolean()
    })
});
export const apiResponseSchema = (dataSchema) => z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z.object({
        code: z.string(),
        message: z.string()
    }).nullable()
});
export const authResponseSchema = z.object({
    success: z.boolean(),
    token: z.string().nullable(),
    user: userSchema.nullable(),
    agent: agentSchema.nullable(),
    error: z.object({
        code: z.string(),
        message: z.string()
    }).nullable()
});
//# sourceMappingURL=schema.js.map