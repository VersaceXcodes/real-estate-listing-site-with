-- =============================================
-- DROP EXISTING TABLES (in correct order due to foreign keys)
-- =============================================
DROP TABLE IF EXISTS listing_notes CASCADE;
DROP TABLE IF EXISTS open_house_rsvps CASCADE;
DROP TABLE IF EXISTS open_houses CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS property_analytics_daily CASCADE;
DROP TABLE IF EXISTS agent_analytics_daily CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS property_status_history CASCADE;
DROP TABLE IF EXISTS property_price_history CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS agent_notification_preferences CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;
DROP TABLE IF EXISTS property_reports CASCADE;
DROP TABLE IF EXISTS property_views CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS inquiry_replies CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS property_photos CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Users Table
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    profile_photo_url TEXT,
    location TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Agents Table
CREATE TABLE agents (
    agent_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_state TEXT NOT NULL,
    agency_name TEXT NOT NULL,
    office_address_street TEXT NOT NULL,
    office_address_city TEXT NOT NULL,
    office_address_state TEXT NOT NULL,
    office_address_zip TEXT NOT NULL,
    years_experience TEXT NOT NULL,
    license_document_url TEXT,
    profile_photo_url TEXT,
    professional_title TEXT,
    bio TEXT,
    specializations JSONB,
    service_areas JSONB,
    languages_spoken JSONB,
    social_media_links JSONB,
    certifications JSONB,
    email_signature TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Properties Table
CREATE TABLE properties (
    property_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    listing_type TEXT NOT NULL,
    property_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    price DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    price_per_sqft DECIMAL(10, 2),
    rent_frequency TEXT,
    address_street TEXT NOT NULL,
    address_unit TEXT,
    address_city TEXT NOT NULL,
    address_state TEXT NOT NULL,
    address_zip TEXT NOT NULL,
    address_country TEXT NOT NULL DEFAULT 'United States',
    latitude TEXT,
    longitude TEXT,
    neighborhood TEXT,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3, 1) NOT NULL,
    square_footage INTEGER NOT NULL,
    lot_size DECIMAL(10, 2),
    lot_size_unit TEXT,
    year_built INTEGER,
    property_style TEXT,
    floors INTEGER,
    parking_spaces INTEGER,
    parking_type TEXT,
    hoa_fee DECIMAL(10, 2),
    hoa_frequency TEXT,
    property_tax DECIMAL(10, 2),
    mls_number TEXT,
    interior_features JSONB,
    exterior_features JSONB,
    appliances_included JSONB,
    utilities_systems JSONB,
    security_features JSONB,
    community_amenities JSONB,
    amenities JSONB,
    additional_features JSONB,
    highlights JSONB,
    furnished BOOLEAN NOT NULL DEFAULT false,
    pet_friendly BOOLEAN NOT NULL DEFAULT false,
    new_construction BOOLEAN NOT NULL DEFAULT false,
    recently_renovated BOOLEAN NOT NULL DEFAULT false,
    virtual_tour_available BOOLEAN NOT NULL DEFAULT false,
    open_house_scheduled BOOLEAN NOT NULL DEFAULT false,
    price_reduced BOOLEAN NOT NULL DEFAULT false,
    youtube_video_url TEXT,
    virtual_tour_url TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    inquiry_count INTEGER NOT NULL DEFAULT 0,
    favorite_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    featured_until TEXT,
    featured_order INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    days_on_market INTEGER
);

-- Property Photos Table
CREATE TABLE property_photos (
    photo_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    caption TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL
);

-- Inquiries Table
CREATE TABLE inquiries (
    inquiry_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    inquirer_name TEXT NOT NULL,
    inquirer_email TEXT NOT NULL,
    inquirer_phone TEXT,
    message TEXT NOT NULL,
    viewing_requested BOOLEAN NOT NULL DEFAULT false,
    preferred_viewing_date TEXT,
    preferred_viewing_time TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    agent_read BOOLEAN NOT NULL DEFAULT false,
    agent_read_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Inquiry Replies Table
CREATE TABLE inquiry_replies (
    reply_id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES inquiries(inquiry_id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    include_signature BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL
);

-- Favorites Table
CREATE TABLE favorites (
    favorite_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, property_id)
);

-- Property Views Table
CREATE TABLE property_views (
    view_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    viewed_at TEXT NOT NULL
);

-- Property Reports Table
CREATE TABLE property_reports (
    report_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    reporter_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    reporter_email TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by_admin_id TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

-- User Notification Preferences Table
CREATE TABLE user_notification_preferences (
    preference_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    saved_property_price_change BOOLEAN NOT NULL DEFAULT true,
    saved_property_status_change BOOLEAN NOT NULL DEFAULT true,
    new_matching_properties BOOLEAN NOT NULL DEFAULT false,
    agent_reply_received BOOLEAN NOT NULL DEFAULT true,
    platform_updates BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id)
);

-- Agent Notification Preferences Table
CREATE TABLE agent_notification_preferences (
    preference_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    new_inquiry_received BOOLEAN NOT NULL DEFAULT true,
    inquirer_replied BOOLEAN NOT NULL DEFAULT true,
    property_view_milestones BOOLEAN NOT NULL DEFAULT true,
    monthly_report BOOLEAN NOT NULL DEFAULT true,
    platform_updates BOOLEAN NOT NULL DEFAULT false,
    notification_frequency TEXT NOT NULL DEFAULT 'instant',
    browser_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(agent_id)
);

-- Saved Searches Table
CREATE TABLE saved_searches (
    saved_search_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    search_name TEXT NOT NULL,
    location TEXT,
    min_price DECIMAL(15, 2),
    max_price DECIMAL(15, 2),
    listing_type TEXT,
    property_type JSONB,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    min_sqft INTEGER,
    max_sqft INTEGER,
    amenities JSONB,
    features JSONB,
    alert_frequency TEXT NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Property Price History Table
CREATE TABLE property_price_history (
    history_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    old_price DECIMAL(15, 2) NOT NULL,
    new_price DECIMAL(15, 2) NOT NULL,
    price_change_amount DECIMAL(15, 2) NOT NULL,
    price_change_percentage DECIMAL(5, 2) NOT NULL,
    changed_at TEXT NOT NULL
);

-- Property Status History Table
CREATE TABLE property_status_history (
    history_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by_agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    notes TEXT,
    changed_at TEXT NOT NULL
);

-- Agent Sessions Table
CREATE TABLE agent_sessions (
    session_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_info TEXT,
    browser_info TEXT,
    ip_address TEXT,
    last_active_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- User Sessions Table
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_info TEXT,
    browser_info TEXT,
    ip_address TEXT,
    last_active_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Admins Table
CREATE TABLE admins (
    admin_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'moderator',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Agent Analytics Daily Table
CREATE TABLE agent_analytics_daily (
    analytics_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    total_views INTEGER NOT NULL DEFAULT 0,
    total_inquiries INTEGER NOT NULL DEFAULT 0,
    total_favorites INTEGER NOT NULL DEFAULT 0,
    active_listings_count INTEGER NOT NULL DEFAULT 0,
    properties_sold INTEGER NOT NULL DEFAULT 0,
    properties_rented INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(agent_id, date)
);

-- Property Analytics Daily Table
CREATE TABLE property_analytics_daily (
    analytics_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    inquiries INTEGER NOT NULL DEFAULT 0,
    favorites INTEGER NOT NULL DEFAULT 0,
    gallery_views INTEGER NOT NULL DEFAULT 0,
    map_interactions INTEGER NOT NULL DEFAULT 0,
    average_time_on_page DECIMAL(10, 2),
    created_at TEXT NOT NULL,
    UNIQUE(property_id, date)
);

-- Email Logs Table
CREATE TABLE email_logs (
    log_id TEXT PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    recipient_id TEXT,
    email_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TEXT,
    opened_at TEXT,
    clicked_at TEXT,
    bounced_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Open Houses Table
CREATE TABLE open_houses (
    open_house_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    scheduled_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    description TEXT,
    rsvp_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Open House RSVPs Table
CREATE TABLE open_house_rsvps (
    rsvp_id TEXT PRIMARY KEY,
    open_house_id TEXT NOT NULL REFERENCES open_houses(open_house_id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    number_of_guests INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL
);

-- Listing Notes Table
CREATE TABLE listing_notes (
    note_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    note_type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Users
INSERT INTO users (user_id, email, password_hash, full_name, phone_number, email_verified, email_verification_token, password_reset_token, password_reset_expires, profile_photo_url, location, created_at, updated_at) VALUES
('user_001', 'john.smith@example.com', 'password123', 'John Smith', '555-0101', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'San Francisco, CA', '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),
('user_002', 'sarah.johnson@example.com', 'password123', 'Sarah Johnson', '555-0102', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Los Angeles, CA', '2024-01-16T11:30:00Z', '2024-01-16T11:30:00Z'),
('user_003', 'michael.chen@example.com', 'password123', 'Michael Chen', '555-0103', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'New York, NY', '2024-01-17T09:15:00Z', '2024-01-17T09:15:00Z'),
('user_004', 'emma.davis@example.com', 'password123', 'Emma Davis', '555-0104', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'Miami, FL', '2024-01-18T14:20:00Z', '2024-01-18T14:20:00Z'),
('user_005', 'david.martinez@example.com', 'password123', 'David Martinez', '555-0105', false, 'verify_token_123', NULL, NULL, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Austin, TX', '2024-01-19T16:45:00Z', '2024-01-19T16:45:00Z'),
('user_006', 'lisa.anderson@example.com', 'password123', 'Lisa Anderson', '555-0106', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'Seattle, WA', '2024-01-20T08:30:00Z', '2024-01-20T08:30:00Z'),
('user_007', 'james.wilson@example.com', 'password123', 'James Wilson', '555-0107', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Boston, MA', '2024-01-21T12:00:00Z', '2024-01-21T12:00:00Z'),
('user_008', 'olivia.brown@example.com', 'password123', 'Olivia Brown', '555-0108', true, NULL, NULL, NULL, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', 'Chicago, IL', '2024-01-22T10:15:00Z', '2024-01-22T10:15:00Z');

-- Seed Agents
INSERT INTO agents (agent_id, email, password_hash, full_name, phone_number, license_number, license_state, agency_name, office_address_street, office_address_city, office_address_state, office_address_zip, years_experience, license_document_url, profile_photo_url, professional_title, bio, specializations, service_areas, languages_spoken, social_media_links, certifications, email_signature, approved, approval_status, rejection_reason, email_verified, email_verification_token, password_reset_token, password_reset_expires, account_status, created_at, updated_at) VALUES
('agent_001', 'robert.williams@realty.com', 'agent123', 'Robert Williams', '555-1001', 'CA-DRE-12345678', 'California', 'Premier Realty Group', '123 Market Street', 'San Francisco', 'CA', '94103', '12', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400', 'Senior Real Estate Broker', 'With over 12 years of experience in the San Francisco Bay Area, I specialize in luxury homes and investment properties. My commitment is to provide personalized service and expert guidance throughout your real estate journey.', '["Luxury Homes", "Investment Properties", "Commercial Real Estate"]', '["San Francisco", "Palo Alto", "San Jose", "Oakland"]', '["English", "Spanish"]', '{"linkedin": "linkedin.com/in/robertwilliams", "facebook": "facebook.com/robertwilliamsrealty", "instagram": "@robertwilliamsrealty"}', '["Certified Luxury Home Marketing Specialist", "Accredited Buyer Representative"]', 'Robert Williams\nSenior Real Estate Broker\nPremier Realty Group\n555-1001 | robert.williams@realty.com', true, 'approved', NULL, true, NULL, NULL, NULL, 'active', '2023-11-10T09:00:00Z', '2024-01-15T10:00:00Z'),
('agent_002', 'jennifer.lee@homes.com', 'agent123', 'Jennifer Lee', '555-1002', 'CA-DRE-87654321', 'California', 'Dream Homes Realty', '456 Sunset Blvd', 'Los Angeles', 'CA', '90028', '8', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', 'Real Estate Specialist', 'Passionate about helping families find their dream homes in Los Angeles. I bring energy, dedication, and market expertise to every transaction.', '["Residential Sales", "First-Time Buyers", "Family Homes"]', '["Los Angeles", "Santa Monica", "Beverly Hills", "Pasadena"]', '["English", "Mandarin", "Cantonese"]', '{"linkedin": "linkedin.com/in/jenniferlee", "instagram": "@jenniferleehomes"}', '["Certified Residential Specialist"]', 'Jennifer Lee\nReal Estate Specialist\nDream Homes Realty\n555-1002 | jennifer.lee@homes.com', true, 'approved', NULL, true, NULL, NULL, NULL, 'active', '2023-12-01T10:30:00Z', '2024-01-15T10:00:00Z'),
('agent_003', 'thomas.garcia@elite.com', 'agent123', 'Thomas Garcia', '555-1003', 'NY-LIC-98765432', 'New York', 'Elite Property Management', '789 Fifth Avenue', 'New York', 'NY', '10022', '15', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'Managing Broker', 'Award-winning broker with extensive experience in Manhattan''s competitive real estate market. Specializing in high-end condos and penthouses.', '["Luxury Condos", "Penthouses", "Investment Properties"]', '["Manhattan", "Brooklyn", "Queens"]', '["English", "Spanish", "Portuguese"]', '{"linkedin": "linkedin.com/in/thomasgarcia", "twitter": "@thomasgarciarealty"}', '["Certified Luxury Home Marketing Specialist", "Real Estate Negotiation Expert"]', 'Thomas Garcia\nManaging Broker\nElite Property Management\n555-1003 | thomas.garcia@elite.com', true, 'approved', NULL, true, NULL, NULL, NULL, 'active', '2023-10-15T08:00:00Z', '2024-01-15T10:00:00Z'),
('agent_004', 'maria.rodriguez@coastal.com', 'agent123', 'Maria Rodriguez', '555-1004', 'FL-LIC-55443322', 'Florida', 'Coastal Living Realty', '321 Ocean Drive', 'Miami', 'FL', '33139', '6', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Luxury Real Estate Advisor', 'Specializing in waterfront properties and luxury estates throughout South Florida. I''ll help you find your perfect coastal paradise.', '["Waterfront Properties", "Luxury Estates", "Vacation Homes"]', '["Miami Beach", "Coral Gables", "Fort Lauderdale", "Key Biscayne"]', '["English", "Spanish"]', '{"instagram": "@mariacoastalrealty", "facebook": "facebook.com/mariacoastalrealty"}', '["Luxury Home Specialist"]', 'Maria Rodriguez\nLuxury Real Estate Advisor\nCoastal Living Realty\n555-1004 | maria.rodriguez@coastal.com', true, 'approved', NULL, true, NULL, NULL, NULL, 'active', '2024-01-05T11:00:00Z', '2024-01-15T10:00:00Z'),
('agent_005', 'patrick.obrien@metro.com', 'agent123', 'Patrick O''Brien', '555-1005', 'TX-LIC-11223344', 'Texas', 'Metro City Realty', '555 Congress Avenue', 'Austin', 'TX', '78701', '10', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400', 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400', 'Real Estate Broker', 'Austin native helping people relocate and invest in one of the fastest-growing cities in America. Let''s find your Texas dream home!', '["Residential", "Relocation Services", "New Construction"]', '["Austin", "Round Rock", "Cedar Park", "Pflugerville"]', '["English"]', '{"linkedin": "linkedin.com/in/patrickobrien", "twitter": "@patobrienhomes"}', '["Relocation Specialist", "New Home Sales Specialist"]', 'Patrick O''Brien\nReal Estate Broker\nMetro City Realty\n555-1005 | patrick.obrien@metro.com', true, 'approved', NULL, true, NULL, NULL, NULL, 'active', '2023-11-20T09:30:00Z', '2024-01-15T10:00:00Z');

-- Seed Properties
INSERT INTO properties (property_id, agent_id, title, description, listing_type, property_type, status, price, currency, price_per_sqft, rent_frequency, address_street, address_unit, address_city, address_state, address_zip, address_country, latitude, longitude, neighborhood, bedrooms, bathrooms, square_footage, lot_size, lot_size_unit, year_built, property_style, floors, parking_spaces, parking_type, hoa_fee, hoa_frequency, property_tax, mls_number, interior_features, exterior_features, appliances_included, utilities_systems, security_features, community_amenities, amenities, additional_features, highlights, furnished, pet_friendly, new_construction, recently_renovated, virtual_tour_available, open_house_scheduled, price_reduced, youtube_video_url, virtual_tour_url, view_count, inquiry_count, favorite_count, is_featured, featured_until, featured_order, created_at, updated_at, published_at, days_on_market) VALUES
('prop_001', 'agent_001', 'Stunning Modern Luxury Home with Bay Views', 'This architecturally significant modern masterpiece offers breathtaking views of the San Francisco Bay. The open-concept design features floor-to-ceiling windows, chef''s kitchen with top-of-the-line appliances, and smart home technology throughout. The master suite includes a spa-like bathroom and private balcony. Perfect for entertaining with spacious living areas and a rooftop terrace.', 'sale', 'house', 'active', 2850000.00, 'USD', 950.00, NULL, '2450 Pacific Heights Avenue', NULL, 'San Francisco', 'CA', '94115', 'United States', '37.7749', '-122.4194', 'Pacific Heights', 4, 3.5, 3000, 0.15, 'acres', 2019, 'Contemporary', 3, 2, 'Attached Garage', 500.00, 'monthly', 28500.00, 'MLS-SF-98765', '["Hardwood Floors", "High Ceilings", "Walk-in Closets", "Home Office", "Wine Cellar"]', '["Rooftop Deck", "Private Patio", "Landscaped Garden", "City Views"]', '["Stainless Steel Appliances", "Double Oven", "Wine Refrigerator", "Built-in Coffee Maker"]', '["Central AC", "Radiant Heating", "Tank Water Heater"]', '["Security System", "Video Doorbell", "Smart Locks"]', '["Fitness Center", "Concierge Service"]', '["Smart Home", "Fireplace", "Bay Views"]', '["Elevator", "Tesla Charger", "Storage Room"]', '["Panoramic Views", "Chef''s Kitchen", "Smart Home Technology", "Rooftop Terrace"]', false, false, false, true, true, true, false, 'https://youtube.com/watch?v=example1', 'https://my.matterport.com/show/?m=example1', 1247, 23, 34, true, '2024-03-15T00:00:00Z', 1, '2024-01-10T09:00:00Z', '2024-01-25T10:00:00Z', '2024-01-10T12:00:00Z', 15),
('prop_002', 'agent_002', 'Beautiful Family Home in Santa Monica', 'Charming 4-bedroom, 3-bathroom home in the heart of Santa Monica. This beautifully updated residence features an open floor plan, gourmet kitchen, and spacious backyard perfect for family gatherings. Walking distance to top-rated schools, parks, and the beach. Move-in ready!', 'sale', 'house', 'active', 1895000.00, 'USD', 790.00, NULL, '1234 Ocean Park Boulevard', NULL, 'Santa Monica', 'CA', '90405', 'United States', '34.0151', '-118.4914', 'Ocean Park', 4, 3.0, 2400, 0.18, 'acres', 2005, 'Traditional', 2, 2, 'Driveway', 0.00, NULL, 18950.00, 'MLS-LA-45678', '["Hardwood Floors", "Updated Kitchen", "Master Suite", "Laundry Room"]', '["Private Backyard", "Patio", "Sprinkler System", "Mature Trees"]', '["Stainless Steel Appliances", "Gas Range", "Dishwasher"]', '["Central AC", "Forced Air Heating", "Tank Water Heater"]', '["Smoke Detectors", "Carbon Monoxide Detectors"]', '[]', '["Fireplace", "Backyard", "Near Schools"]', '["Solar Panels"]', '["Walking Distance to Beach", "Top-Rated Schools", "Updated Throughout"]', false, true, false, true, false, false, false, NULL, NULL, 876, 18, 27, true, '2024-02-28T00:00:00Z', 2, '2024-01-12T10:30:00Z', '2024-01-25T10:00:00Z', '2024-01-12T14:00:00Z', 13),
('prop_003', 'agent_003', 'Luxurious Manhattan Penthouse with Terrace', 'Exceptional penthouse offering 360-degree views of Manhattan''s iconic skyline. This ultra-luxury residence spans the entire top floor with 12-foot ceilings, custom Italian finishes, and a private elevator entrance. The expansive terrace is perfect for entertaining. Building amenities include 24-hour concierge, gym, pool, and valet parking.', 'sale', 'condo', 'active', 12500000.00, 'USD', 3125.00, NULL, '432 Park Avenue', 'PH-92', 'New York', 'NY', '10022', 'United States', '40.7614', '-73.9776', 'Midtown Manhattan', 5, 5.5, 4000, NULL, NULL, 2018, 'High-Rise', 1, 3, 'Valet Parking', 4500.00, 'monthly', 125000.00, 'MLS-NY-78901', '["Marble Floors", "Custom Millwork", "Chef''s Kitchen", "Home Automation", "Walk-in Closets"]', '["Private Terrace", "Skyline Views", "Central Park Views"]', '["Sub-Zero Refrigerator", "Wolf Range", "Miele Dishwasher", "Wine Storage"]', '["Central AC", "Radiant Heating", "Tankless Water Heater"]', '["24-Hour Security", "Video Surveillance", "Secured Entry"]', '["Doorman", "Concierge", "Fitness Center", "Pool", "Spa", "Parking"]', '["Private Elevator", "Terrace", "Skyline Views"]', '["Smart Home System", "Built-in Speakers"]', '["360-Degree Views", "Private Terrace", "Full-Floor Penthouse", "5-Star Amenities"]', true, false, false, false, true, false, false, 'https://youtube.com/watch?v=example3', 'https://my.matterport.com/show/?m=example3', 2341, 45, 67, true, '2024-04-01T00:00:00Z', 3, '2024-01-08T08:00:00Z', '2024-01-25T10:00:00Z', '2024-01-08T10:00:00Z', 17),
('prop_004', 'agent_004', 'Waterfront Paradise in Miami Beach', 'Stunning waterfront estate with 100 feet of water frontage and private dock. This Mediterranean-style villa features 6 bedrooms, 7 bathrooms, resort-style pool, and outdoor kitchen. Floor-to-ceiling impact windows showcase breathtaking water views. Gated community with 24-hour security.', 'sale', 'house', 'active', 8750000.00, 'USD', 1458.33, NULL, '5678 Bay Drive', NULL, 'Miami Beach', 'FL', '33140', 'United States', '25.8195', '-80.1305', 'Bay Harbor Islands', 6, 7.0, 6000, 0.40, 'acres', 2020, 'Mediterranean', 2, 4, 'Attached Garage', 1200.00, 'monthly', 87500.00, 'MLS-FL-23456', '["Marble Floors", "High Ceilings", "Grand Staircase", "Home Theater", "Wine Cellar", "Gym"]', '["Private Dock", "Pool", "Outdoor Kitchen", "Cabana", "Waterfront"]', '["High-End Appliances", "Double Ovens", "Ice Maker", "Warming Drawer"]', '["Central AC", "Zoned HVAC", "Tankless Water Heater"]', '["Gated Community", "Security Cameras", "Alarm System"]', '["Private Beach Access", "Marina"]', '["Waterfront", "Pool", "Dock", "Water Views"]', '["Generator", "Hurricane Impact Windows"]', '["Direct Ocean Access", "Private Dock", "Resort-Style Living", "New Construction"]', false, true, true, false, true, true, false, NULL, 'https://my.matterport.com/show/?m=example4', 1567, 31, 52, false, NULL, NULL, '2024-01-14T11:00:00Z', '2024-01-25T10:00:00Z', '2024-01-14T15:00:00Z', 11),
('prop_005', 'agent_005', 'Modern Downtown Austin Condo', 'Sleek and sophisticated 2-bedroom, 2-bathroom condo in the heart of downtown Austin. Floor-to-ceiling windows offer stunning city views. Building features rooftop pool, fitness center, and concierge service. Walk to restaurants, entertainment, and Lady Bird Lake.', 'sale', 'condo', 'active', 685000.00, 'USD', 570.83, NULL, '360 Nueces Street', '1502', 'Austin', 'TX', '78701', 'United States', '30.2672', '-97.7431', 'Downtown', 2, 2.0, 1200, NULL, NULL, 2021, 'High-Rise', 1, 1, 'Garage', 350.00, 'monthly', 6850.00, 'MLS-TX-34567', '["Wood Floors", "Open Concept", "Island Kitchen", "Walk-in Closet"]', '["Balcony", "City Views"]', '["Stainless Steel Appliances", "Quartz Countertops"]', '["Central AC", "Forced Air Heating"]', '["Secure Building", "Controlled Access"]', '["Pool", "Fitness Center", "Concierge", "Dog Park"]', '["City Views", "Modern Design", "Walkable Location"]', '["Smart Thermostat"]', '["Prime Downtown Location", "Walkable to Everything", "Modern Amenities"]', false, true, true, false, true, false, false, NULL, NULL, 743, 16, 21, false, NULL, NULL, '2024-01-15T09:30:00Z', '2024-01-25T10:00:00Z', '2024-01-15T12:00:00Z', 10),
('prop_006', 'agent_001', 'Charming Victorian in Noe Valley', 'Beautifully restored Victorian home with original details and modern upgrades. This 3-bedroom, 2.5-bathroom gem features high ceilings, crown molding, and refinished hardwood floors. Private backyard oasis perfect for outdoor dining. Excellent Noe Valley location near shops and restaurants.', 'sale', 'house', 'active', 2450000.00, 'USD', 1020.83, NULL, '789 Noe Street', NULL, 'San Francisco', 'CA', '94114', 'United States', '37.7510', '-122.4331', 'Noe Valley', 3, 2.5, 2400, 0.08, 'acres', 1905, 'Victorian', 3, 1, 'Street', 0.00, NULL, 24500.00, 'MLS-SF-56789', '["Original Details", "Hardwood Floors", "Crown Molding", "Updated Kitchen"]', '["Private Backyard", "Deck", "Garden"]', '["Stainless Steel Appliances", "Gas Range"]', '["Forced Air Heating", "Tank Water Heater"]', '["Smoke Detectors"]', '[]', '["Historic Home", "Private Yard", "Prime Location"]', '["Period Details", "Restored"]', '["Victorian Charm", "Modern Updates", "Prime Noe Valley"]', false, true, false, true, false, false, false, NULL, NULL, 632, 14, 19, false, NULL, NULL, '2024-01-16T10:00:00Z', '2024-01-25T10:00:00Z', '2024-01-16T13:00:00Z', 9),
('prop_007', 'agent_002', 'Spacious Beverly Hills Family Estate', 'Magnificent estate in prime Beverly Hills location. This 5-bedroom, 6-bathroom home sits on nearly half an acre with pool, spa, and pool house. Grand entertaining spaces, gourmet kitchen, and luxurious master suite. Top-rated schools and close to Rodeo Drive.', 'sale', 'house', 'active', 9500000.00, 'USD', 1583.33, NULL, '1010 Benedict Canyon Drive', NULL, 'Beverly Hills', 'CA', '90210', 'United States', '34.0901', '-118.3965', 'Benedict Canyon', 5, 6.0, 6000, 0.45, 'acres', 2015, 'Contemporary', 2, 3, 'Attached Garage', 800.00, 'monthly', 95000.00, 'MLS-LA-67890', '["Marble Floors", "Custom Cabinetry", "Home Theater", "Wine Room", "Gym"]', '["Pool", "Spa", "Pool House", "Outdoor Kitchen", "Manicured Grounds"]', '["Professional Appliances", "Double Islands", "Butler''s Pantry"]', '["Central AC", "Zoned HVAC", "Tankless Water Heater"]', '["Gated Entry", "Security System", "Cameras"]', '["Guard-Gated Community"]', '["Pool", "Guest House", "Home Theater"]', '["Smart Home", "Sound System"]', '["Beverly Hills Location", "Resort-Style Grounds", "Top Schools"]', false, false, false, false, true, false, false, NULL, 'https://my.matterport.com/show/?m=example7', 1123, 28, 41, false, NULL, NULL, '2024-01-13T09:00:00Z', '2024-01-25T10:00:00Z', '2024-01-13T11:00:00Z', 12),
('prop_008', 'agent_003', 'Brooklyn Heights Townhouse', 'Stunning 4-story townhouse in historic Brooklyn Heights. This 4-bedroom, 3.5-bathroom home features original details, modern kitchen, and multiple outdoor spaces. Private garden, roof deck with Manhattan views, and finished basement. Steps to Brooklyn Bridge Park.', 'sale', 'townhouse', 'active', 4750000.00, 'USD', 1583.33, NULL, '123 Pierrepont Street', NULL, 'Brooklyn', 'NY', '11201', 'United States', '40.6942', '-73.9936', 'Brooklyn Heights', 4, 3.5, 3000, NULL, NULL, 1890, 'Brownstone', 4, 0, 'None', 200.00, 'monthly', 47500.00, 'MLS-NY-89012', '["Original Details", "Exposed Brick", "Hardwood Floors", "Modern Kitchen", "Fireplace"]', '["Private Garden", "Roof Deck", "Manhattan Views"]', '["Stainless Steel Appliances", "Wine Refrigerator"]', '["Central AC", "Radiant Heating"]', '["Security System"]', '[]', '["Historic Home", "Outdoor Space", "Views"]', '["Finished Basement", "Storage"]', '["Brooklyn Heights Historic District", "Multiple Outdoor Spaces", "Near Parks"]', false, true, false, true, false, false, false, NULL, NULL, 892, 20, 28, false, NULL, NULL, '2024-01-17T10:30:00Z', '2024-01-25T10:00:00Z', '2024-01-17T12:00:00Z', 8),
('prop_009', 'agent_004', 'Luxury Coral Gables Villa', 'Exquisite Mediterranean villa in prestigious Coral Gables. This 4-bedroom, 5-bathroom home features soaring ceilings, marble floors, and chef''s kitchen. Resort-style pool and summer kitchen in private backyard. Walking distance to Miracle Mile.', 'sale', 'house', 'active', 3750000.00, 'USD', 1250.00, NULL, '456 Alhambra Circle', NULL, 'Coral Gables', 'FL', '33134', 'United States', '25.7207', '-80.2684', 'Coral Gables', 4, 5.0, 3000, 0.25, 'acres', 2018, 'Mediterranean', 2, 2, 'Attached Garage', 600.00, 'monthly', 37500.00, 'MLS-FL-12345', '["Marble Floors", "High Ceilings", "Crown Molding", "Gourmet Kitchen"]', '["Pool", "Summer Kitchen", "Covered Terrace", "Private Yard"]', '["Professional Appliances", "Double Oven", "Wine Refrigerator"]', '["Central AC", "Zoned HVAC"]', '["Alarm System", "Cameras"]', '[]', '["Pool", "Gourmet Kitchen", "Prime Location"]', '["Impact Windows", "Generator"]', '["Mediterranean Architecture", "Prime Coral Gables", "Resort Living"]', false, true, false, false, false, false, false, NULL, NULL, 678, 15, 23, false, NULL, NULL, '2024-01-18T11:00:00Z', '2024-01-25T10:00:00Z', '2024-01-18T14:00:00Z', 7),
('prop_010', 'agent_005', 'Hill Country Ranch Estate', 'Spectacular 50-acre ranch estate in the Texas Hill Country. Main house features 5 bedrooms, 5 bathrooms with panoramic hill views. Guest house, barn, and pool. Perfect for horses or vineyard. Private and serene setting just 30 minutes from downtown Austin.', 'sale', 'house', 'active', 4250000.00, 'USD', 850.00, NULL, '2500 Ranch Road 12', NULL, 'Dripping Springs', 'TX', '78620', 'United States', '30.1902', '-98.0861', 'Hill Country', 5, 5.0, 5000, 50.00, 'acres', 2017, 'Ranch', 1, 4, 'Detached Garage', 0.00, NULL, 42500.00, 'MLS-TX-45678', '["Stone Floors", "Vaulted Ceilings", "Gourmet Kitchen", "Office", "Game Room"]', '["Pool", "Guest House", "Barn", "Pasture", "Hill Views"]', '["Professional Appliances", "Double Islands"]', '["Central AC", "Zoned HVAC", "Tankless Water Heater"]', '["Gated Entry", "Security System"]', '[]', '["Guest House", "Pool", "Acreage", "Views"]', '["Barn", "Horse Facilities", "Well Water"]', '["50 Acres", "Hill Country Views", "Complete Privacy", "Guest House"]', false, true, false, false, false, false, false, NULL, NULL, 523, 12, 17, false, NULL, NULL, '2024-01-19T09:00:00Z', '2024-01-25T10:00:00Z', '2024-01-19T11:00:00Z', 6),
('prop_011', 'agent_001', 'Marina District Luxury Condo', 'Stunning 2-bedroom, 2-bathroom condo with Golden Gate Bridge views. Modern open layout, chef''s kitchen, and private balcony. Building features gym, rooftop terrace, and garage parking. Walk to Marina Green and restaurants.', 'rent', 'condo', 'active', 4500.00, 'USD', 3.75, 'monthly', '3200 Scott Street', '405', 'San Francisco', 'CA', '94123', 'United States', '37.8008', '-122.4401', 'Marina District', 2, 2.0, 1200, NULL, NULL, 2019, 'High-Rise', 1, 1, 'Garage', 0.00, NULL, NULL, 'MLS-SF-11111', '["Hardwood Floors", "Open Layout", "Modern Kitchen", "In-Unit Laundry"]', '["Balcony", "Bridge Views"]', '["Stainless Steel Appliances", "Quartz Countertops"]', '["Central AC", "Forced Air Heating"]', '["Secure Building", "Doorman"]', '["Gym", "Rooftop Terrace", "Bike Storage"]', '["Views", "Modern", "Amenities"]', '[]', '["Golden Gate Views", "Prime Marina Location", "Modern Building"]', false, true, false, false, false, false, false, NULL, NULL, 412, 8, 12, false, NULL, NULL, '2024-01-20T10:00:00Z', '2024-01-25T10:00:00Z', '2024-01-20T12:00:00Z', 5),
('prop_012', 'agent_002', 'Venice Beach Bungalow', 'Charming 2-bedroom, 1-bathroom beach bungalow steps from the sand. Updated interior, private patio, and parking. Perfect beach lifestyle location near Abbot Kinney and Rose Avenue.', 'rent', 'house', 'active', 3800.00, 'USD', 3.80, 'monthly', '234 Ocean Front Walk', NULL, 'Venice', 'CA', '90291', 'United States', '33.9850', '-118.4695', 'Venice Beach', 2, 1.0, 1000, NULL, NULL, 1960, 'Bungalow', 1, 1, 'Driveway', 0.00, NULL, NULL, 'MLS-LA-22222', '["Updated Interior", "Hardwood Floors"]', '["Private Patio", "Near Beach"]', '["Updated Appliances"]', '["Central AC"]', '[]', '[]', '["Beach Location", "Patio"]', '[]', '["Steps to Beach", "Venice Lifestyle", "Updated"]', false, true, false, true, false, false, false, NULL, NULL, 356, 9, 14, false, NULL, NULL, '2024-01-21T11:00:00Z', '2024-01-25T10:00:00Z', '2024-01-21T13:00:00Z', 4);

-- Seed Property Photos
INSERT INTO property_photos (photo_id, property_id, image_url, thumbnail_url, display_order, is_primary, caption, file_size, created_at) VALUES
-- Property 1 Photos
('photo_001', 'prop_001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', 1, true, 'Front exterior view', 2456789, '2024-01-10T09:00:00Z'),
('photo_002', 'prop_001', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400', 2, false, 'Living room with bay views', 2134567, '2024-01-10T09:01:00Z'),
('photo_003', 'prop_001', 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200', 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=400', 3, false, 'Modern kitchen', 1987654, '2024-01-10T09:02:00Z'),
('photo_004', 'prop_001', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400', 4, false, 'Master bedroom', 1876543, '2024-01-10T09:03:00Z'),
('photo_005', 'prop_001', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', 5, false, 'Rooftop terrace', 2234567, '2024-01-10T09:04:00Z'),
-- Property 2 Photos
('photo_006', 'prop_002', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400', 1, true, 'Charming front exterior', 2345678, '2024-01-12T10:30:00Z'),
('photo_007', 'prop_002', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400', 2, false, 'Open living and dining area', 2123456, '2024-01-12T10:31:00Z'),
('photo_008', 'prop_002', 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1200', 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400', 3, false, 'Updated kitchen', 1987654, '2024-01-12T10:32:00Z'),
('photo_009', 'prop_002', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400', 4, false, 'Spacious backyard', 2234567, '2024-01-12T10:33:00Z'),
-- Property 3 Photos
('photo_010', 'prop_003', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400', 1, true, 'Penthouse exterior view', 2567890, '2024-01-08T08:00:00Z'),
('photo_011', 'prop_003', 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200', 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400', 2, false, 'Luxury living room', 2456789, '2024-01-08T08:01:00Z'),
('photo_012', 'prop_003', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400', 3, false, 'Chef''s kitchen', 2345678, '2024-01-08T08:02:00Z'),
('photo_013', 'prop_003', 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=1200', 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=400', 4, false, 'Private terrace with views', 2678901, '2024-01-08T08:03:00Z'),
-- Property 4 Photos
('photo_014', 'prop_004', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400', 1, true, 'Waterfront estate exterior', 2789012, '2024-01-14T11:00:00Z'),
('photo_015', 'prop_004', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400', 2, false, 'Grand living room', 2567890, '2024-01-14T11:01:00Z'),
('photo_016', 'prop_004', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400', 3, false, 'Resort-style pool', 2456789, '2024-01-14T11:02:00Z'),
('photo_017', 'prop_004', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1200', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=400', 4, false, 'Private dock', 2345678, '2024-01-14T11:03:00Z'),
-- Property 5 Photos
('photo_018', 'prop_005', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400', 1, true, 'Modern condo building', 2234567, '2024-01-15T09:30:00Z'),
('photo_019', 'prop_005', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400', 2, false, 'Open living space with city views', 2123456, '2024-01-15T09:31:00Z'),
('photo_020', 'prop_005', 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=1200', 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=400', 3, false, 'Modern kitchen', 1987654, '2024-01-15T09:32:00Z'),
-- Property 6 Photos
('photo_021', 'prop_006', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400', 1, true, 'Victorian exterior', 2456789, '2024-01-16T10:00:00Z'),
('photo_022', 'prop_006', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', 2, false, 'Period details in living room', 2234567, '2024-01-16T10:01:00Z'),
('photo_023', 'prop_006', 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=1200', 'https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=400', 3, false, 'Updated kitchen', 2123456, '2024-01-16T10:02:00Z'),
-- Property 7 Photos
('photo_024', 'prop_007', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', 1, true, 'Estate exterior', 2789012, '2024-01-13T09:00:00Z'),
('photo_025', 'prop_007', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400', 2, false, 'Grand entrance', 2567890, '2024-01-13T09:01:00Z'),
('photo_026', 'prop_007', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400', 3, false, 'Resort pool', 2456789, '2024-01-13T09:02:00Z'),
-- Property 8 Photos
('photo_027', 'prop_008', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400', 1, true, 'Brownstone exterior', 2456789, '2024-01-17T10:30:00Z'),
('photo_028', 'prop_008', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400', 2, false, 'Historic living room', 2345678, '2024-01-17T10:31:00Z');

-- Seed Inquiries
INSERT INTO inquiries (inquiry_id, property_id, agent_id, user_id, inquirer_name, inquirer_email, inquirer_phone, message, viewing_requested, preferred_viewing_date, preferred_viewing_time, status, agent_read, agent_read_at, created_at, updated_at) VALUES
('inq_001', 'prop_001', 'agent_001', 'user_001', 'John Smith', 'john.smith@example.com', '555-0101', 'I''m very interested in this property. The views are stunning! I''d love to schedule a viewing this weekend if possible.', true, '2024-01-27', '2:00 PM', 'responded', true, '2024-01-22T10:30:00Z', '2024-01-22T09:15:00Z', '2024-01-22T14:20:00Z'),
('inq_002', 'prop_002', 'agent_002', 'user_002', 'Sarah Johnson', 'sarah.johnson@example.com', '555-0102', 'This looks perfect for my family! Can you provide more information about the schools in the area? Also, is the backyard fully fenced?', false, NULL, NULL, 'new', true, '2024-01-22T16:00:00Z', '2024-01-22T15:30:00Z', '2024-01-22T15:30:00Z'),
('inq_003', 'prop_003', 'agent_003', 'user_003', 'Michael Chen', 'michael.chen@example.com', '555-0103', 'Interested in viewing this penthouse. What are the monthly HOA fees and what do they cover? Also, is there a timeline for the seller?', true, '2024-01-28', '11:00 AM', 'responded', true, '2024-01-23T09:00:00Z', '2024-01-23T08:45:00Z', '2024-01-23T11:30:00Z'),
('inq_004', 'prop_001', 'agent_001', NULL, 'Jessica Brown', 'jessica.brown@example.com', '555-0201', 'Beautiful home! I''m relocating from New York. Can you tell me about the neighborhood and nearby amenities?', false, NULL, NULL, 'new', false, NULL, '2024-01-23T14:20:00Z', '2024-01-23T14:20:00Z'),
('inq_005', 'prop_004', 'agent_004', 'user_004', 'Emma Davis', 'emma.davis@example.com', '555-0104', 'This waterfront property is exactly what I''ve been looking for! Is the dock suitable for a 40-foot yacht? I can view it this week.', true, '2024-01-26', '3:00 PM', 'new', true, '2024-01-24T08:15:00Z', '2024-01-24T07:30:00Z', '2024-01-24T07:30:00Z'),
('inq_006', 'prop_005', 'agent_005', 'user_005', 'David Martinez', 'david.martinez@example.com', '555-0105', 'I love downtown living! Is this condo available for immediate move-in? Also, are pets allowed?', false, NULL, NULL, 'responded', true, '2024-01-24T11:00:00Z', '2024-01-24T10:00:00Z', '2024-01-24T13:30:00Z'),
('inq_007', 'prop_002', 'agent_002', 'user_006', 'Lisa Anderson', 'lisa.anderson@example.com', '555-0106', 'We''d like to schedule a viewing. We have two young children and are interested in the school district. Is Saturday morning available?', true, '2024-01-27', '10:00 AM', 'new', false, NULL, '2024-01-24T16:45:00Z', '2024-01-24T16:45:00Z'),
('inq_008', 'prop_007', 'agent_002', 'user_007', 'James Wilson', 'james.wilson@example.com', '555-0107', 'Interested in making an offer on this Beverly Hills estate. Can we discuss pricing and terms? I''m a serious buyer with pre-approval.', false, NULL, NULL, 'responded', true, '2024-01-25T09:30:00Z', '2024-01-25T09:00:00Z', '2024-01-25T12:00:00Z');

-- Seed Inquiry Replies
INSERT INTO inquiry_replies (reply_id, inquiry_id, sender_type, sender_id, message, include_signature, created_at) VALUES
('reply_001', 'inq_001', 'agent', 'agent_001', 'Thank you for your interest! I''d be happy to show you the property this weekend. Saturday at 2:00 PM works perfectly. I''ll send you the exact address and meeting instructions. The views are even more impressive in person!', true, '2024-01-22T14:20:00Z'),
('reply_002', 'inq_001', 'user', 'user_001', 'Perfect! I''ll see you Saturday at 2:00 PM. Looking forward to it!', false, '2024-01-22T14:45:00Z'),
('reply_003', 'inq_003', 'agent', 'agent_003', 'Thank you for your inquiry! The HOA fees are $4,500/month and cover concierge, doorman, fitness center, pool, spa, and all building maintenance. The seller is flexible on timing. Sunday at 11:00 AM works great for a viewing. I''ll prepare a comprehensive information packet for you.', true, '2024-01-23T11:30:00Z'),
('reply_004', 'inq_006', 'agent', 'agent_005', 'Great to hear from you! Yes, the condo is available for immediate occupancy. Pets are welcome with a $500 one-time pet deposit. The building is very pet-friendly with a dog park on the rooftop. Would you like to schedule a viewing?', true, '2024-01-24T13:30:00Z'),
('reply_005', 'inq_008', 'agent', 'agent_002', 'Thank you for your interest in the Beverly Hills estate. I''d be happy to discuss terms. The seller is motivated and considering all serious offers. Given your pre-approval, let''s schedule a private showing and then sit down to discuss numbers. Are you available this week?', true, '2024-01-25T12:00:00Z');

-- Seed Favorites
INSERT INTO favorites (favorite_id, user_id, property_id, created_at) VALUES
('fav_001', 'user_001', 'prop_001', '2024-01-20T10:00:00Z'),
('fav_002', 'user_001', 'prop_006', '2024-01-21T14:30:00Z'),
('fav_003', 'user_002', 'prop_002', '2024-01-20T11:00:00Z'),
('fav_004', 'user_002', 'prop_011', '2024-01-22T09:15:00Z'),
('fav_005', 'user_003', 'prop_003', '2024-01-21T16:45:00Z'),
('fav_006', 'user_003', 'prop_008', '2024-01-23T10:30:00Z'),
('fav_007', 'user_004', 'prop_004', '2024-01-22T13:20:00Z'),
('fav_008', 'user_004', 'prop_009', '2024-01-24T11:00:00Z'),
('fav_009', 'user_005', 'prop_005', '2024-01-23T15:00:00Z'),
('fav_010', 'user_006', 'prop_002', '2024-01-24T10:45:00Z'),
('fav_011', 'user_007', 'prop_007', '2024-01-24T14:30:00Z'),
('fav_012', 'user_008', 'prop_012', '2024-01-25T09:00:00Z');

-- Seed Property Views
INSERT INTO property_views (view_id, property_id, user_id, session_id, ip_address, user_agent, referrer, viewed_at) VALUES
('view_001', 'prop_001', 'user_001', 'sess_u001', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'https://google.com', '2024-01-20T10:00:00Z'),
('view_002', 'prop_001', NULL, 'sess_anon001', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'https://google.com', '2024-01-20T14:30:00Z'),
('view_003', 'prop_001', 'user_002', 'sess_u002', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)', 'https://facebook.com', '2024-01-21T09:15:00Z'),
('view_004', 'prop_002', 'user_002', 'sess_u002', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)', NULL, '2024-01-20T11:00:00Z'),
('view_005', 'prop_003', 'user_003', 'sess_u003', '192.168.1.103', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'https://google.com', '2024-01-21T16:45:00Z'),
('view_006', 'prop_004', 'user_004', 'sess_u004', '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'https://zillow.com', '2024-01-22T13:20:00Z'),
('view_007', 'prop_005', 'user_005', 'sess_u005', '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'https://google.com', '2024-01-23T15:00:00Z'),
('view_008', 'prop_001', NULL, 'sess_anon002', '192.168.1.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'https://instagram.com', '2024-01-23T10:30:00Z');

-- Seed Property Reports
INSERT INTO property_reports (report_id, property_id, reporter_user_id, reporter_email, reason, details, status, admin_notes, resolved_by_admin_id, resolved_at, created_at) VALUES
('report_001', 'prop_001', 'user_007', 'james.wilson@example.com', 'Incorrect Information', 'The listing shows 3000 sq ft but the property records show 2850 sq ft. Please verify.', 'resolved', 'Verified with agent. Updated square footage to correct value.', 'admin_001', '2024-01-24T10:00:00Z', '2024-01-23T16:30:00Z'),
('report_002', 'prop_008', NULL, 'concerned.buyer@example.com', 'Suspicious Listing', 'Price seems too good to be true for this location. Possible scam?', 'pending', NULL, NULL, NULL, '2024-01-24T14:20:00Z');

-- Seed User Notification Preferences
INSERT INTO user_notification_preferences (preference_id, user_id, saved_property_price_change, saved_property_status_change, new_matching_properties, agent_reply_received, platform_updates, created_at, updated_at) VALUES
('pref_u001', 'user_001', true, true, true, true, false, '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),
('pref_u002', 'user_002', true, true, false, true, false, '2024-01-16T11:30:00Z', '2024-01-16T11:30:00Z'),
('pref_u003', 'user_003', true, false, true, true, true, '2024-01-17T09:15:00Z', '2024-01-17T09:15:00Z'),
('pref_u004', 'user_004', true, true, true, true, false, '2024-01-18T14:20:00Z', '2024-01-18T14:20:00Z'),
('pref_u005', 'user_005', false, true, false, true, false, '2024-01-19T16:45:00Z', '2024-01-19T16:45:00Z');

-- Seed Agent Notification Preferences
INSERT INTO agent_notification_preferences (preference_id, agent_id, new_inquiry_received, inquirer_replied, property_view_milestones, monthly_report, platform_updates, notification_frequency, browser_notifications_enabled, created_at, updated_at) VALUES
('pref_a001', 'agent_001', true, true, true, true, true, 'instant', true, '2023-11-10T09:00:00Z', '2024-01-15T10:00:00Z'),
('pref_a002', 'agent_002', true, true, true, true, false, 'instant', true, '2023-12-01T10:30:00Z', '2024-01-15T10:00:00Z'),
('pref_a003', 'agent_003', true, true, false, true, false, 'daily', false, '2023-10-15T08:00:00Z', '2024-01-15T10:00:00Z'),
('pref_a004', 'agent_004', true, true, true, true, true, 'instant', true, '2024-01-05T11:00:00Z', '2024-01-15T10:00:00Z'),
('pref_a005', 'agent_005', true, false, true, false, false, 'instant', false, '2023-11-20T09:30:00Z', '2024-01-15T10:00:00Z');

-- Seed Saved Searches
INSERT INTO saved_searches (saved_search_id, user_id, search_name, location, min_price, max_price, listing_type, property_type, bedrooms, bathrooms, min_sqft, max_sqft, amenities, features, alert_frequency, is_active, created_at, updated_at) VALUES
('search_001', 'user_001', 'SF Luxury Homes', 'San Francisco, CA', 2000000.00, 5000000.00, 'sale', '["house"]', 3, 2.5, 2000, NULL, '["Fireplace", "Bay Views"]', '["Smart Home"]', 'daily', true, '2024-01-20T10:30:00Z', '2024-01-20T10:30:00Z'),
('search_002', 'user_002', 'Santa Monica Family Homes', 'Santa Monica, CA', 1500000.00, 2500000.00, 'sale', '["house"]', 4, 3.0, 2000, 3000, '["Backyard"]', '["Near Schools"]', 'instant', true, '2024-01-21T11:00:00Z', '2024-01-21T11:00:00Z'),
('search_003', 'user_003', 'Manhattan Penthouses', 'Manhattan, NY', 5000000.00, 15000000.00, 'sale', '["condo"]', 3, 3.0, 2500, NULL, '["Doorman", "City Views"]', '[]', 'weekly', true, '2024-01-22T09:15:00Z', '2024-01-22T09:15:00Z'),
('search_004', 'user_004', 'Miami Waterfront', 'Miami, FL', 3000000.00, 10000000.00, 'sale', '["house"]', 4, 4.0, 3000, NULL, '["Waterfront", "Pool"]', '[]', 'daily', true, '2024-01-23T14:20:00Z', '2024-01-23T14:20:00Z'),
('search_005', 'user_005', 'Austin Downtown Condos', 'Austin, TX', 400000.00, 800000.00, 'sale', '["condo"]', 2, 2.0, 1000, 1500, '["City Views", "Gym"]', '[]', 'daily', true, '2024-01-24T16:45:00Z', '2024-01-24T16:45:00Z');

-- Seed Property Price History
INSERT INTO property_price_history (history_id, property_id, old_price, new_price, price_change_amount, price_change_percentage, changed_at) VALUES
('hist_001', 'prop_001', 2950000.00, 2850000.00, -100000.00, -3.39, '2024-01-18T10:00:00Z'),
('hist_002', 'prop_007', 9850000.00, 9500000.00, -350000.00, -3.55, '2024-01-20T11:00:00Z'),
('hist_003', 'prop_002', 1950000.00, 1895000.00, -55000.00, -2.82, '2024-01-19T14:30:00Z');

-- Seed Property Status History
INSERT INTO property_status_history (history_id, property_id, old_status, new_status, changed_by_agent_id, notes, changed_at) VALUES
('status_001', 'prop_001', 'draft', 'active', 'agent_001', 'Initial listing published', '2024-01-10T12:00:00Z'),
('status_002', 'prop_002', 'draft', 'active', 'agent_002', 'Property ready for market', '2024-01-12T14:00:00Z'),
('status_003', 'prop_003', 'draft', 'active', 'agent_003', 'Luxury penthouse listing live', '2024-01-08T10:00:00Z'),
('status_004', 'prop_004', 'draft', 'active', 'agent_004', 'Waterfront estate now available', '2024-01-14T15:00:00Z'),
('status_005', 'prop_005', 'draft', 'active', 'agent_005', 'Downtown condo listing activated', '2024-01-15T12:00:00Z');

-- Seed Agent Sessions
INSERT INTO agent_sessions (session_id, agent_id, token, device_info, browser_info, ip_address, last_active_at, expires_at, created_at) VALUES
('asess_001', 'agent_001', 'agent_token_001_abc123xyz', 'MacBook Pro', 'Chrome 120.0', '192.168.1.50', '2024-01-25T09:00:00Z', '2024-02-25T09:00:00Z', '2024-01-20T09:00:00Z'),
('asess_002', 'agent_002', 'agent_token_002_def456uvw', 'iPhone 15 Pro', 'Safari Mobile', '192.168.1.51', '2024-01-25T08:30:00Z', '2024-02-25T08:30:00Z', '2024-01-21T08:30:00Z'),
('asess_003', 'agent_003', 'agent_token_003_ghi789rst', 'Windows Desktop', 'Edge 120.0', '192.168.1.52', '2024-01-25T07:45:00Z', '2024-02-25T07:45:00Z', '2024-01-22T07:45:00Z');

-- Seed User Sessions
INSERT INTO user_sessions (session_id, user_id, token, device_info, browser_info, ip_address, last_active_at, expires_at, created_at) VALUES
('usess_001', 'user_001', 'user_token_001_jkl012opq', 'MacBook Air', 'Chrome 120.0', '192.168.1.100', '2024-01-25T10:00:00Z', '2024-02-25T10:00:00Z', '2024-01-20T10:00:00Z'),
('usess_002', 'user_002', 'user_token_002_mno345lmn', 'iPhone 14', 'Safari Mobile', '192.168.1.101', '2024-01-25T09:30:00Z', '2024-02-25T09:30:00Z', '2024-01-21T09:30:00Z'),
('usess_003', 'user_003', 'user_token_003_pqr678ijk', 'Samsung Galaxy', 'Chrome Mobile', '192.168.1.102', '2024-01-25T08:45:00Z', '2024-02-25T08:45:00Z', '2024-01-22T08:45:00Z');

-- Seed Admins
INSERT INTO admins (admin_id, email, password_hash, full_name, role, created_at, updated_at) VALUES
('admin_001', 'admin@realestate.com', 'admin123', 'System Administrator', 'admin', '2023-10-01T08:00:00Z', '2024-01-15T10:00:00Z'),
('admin_002', 'moderator@realestate.com', 'moderator123', 'Sarah Moderator', 'moderator', '2023-10-15T09:00:00Z', '2024-01-15T10:00:00Z');

-- Seed Agent Analytics Daily
INSERT INTO agent_analytics_daily (analytics_id, agent_id, date, total_views, total_inquiries, total_favorites, active_listings_count, properties_sold, properties_rented, created_at) VALUES
('analytics_a001', 'agent_001', '2024-01-24', 156, 4, 8, 3, 0, 0, '2024-01-25T00:30:00Z'),
('analytics_a002', 'agent_001', '2024-01-23', 142, 3, 6, 3, 0, 0, '2024-01-24T00:30:00Z'),
('analytics_a003', 'agent_002', '2024-01-24', 198, 6, 11, 4, 0, 0, '2024-01-25T00:30:00Z'),
('analytics_a004', 'agent_002', '2024-01-23', 187, 5, 9, 4, 0, 0, '2024-01-24T00:30:00Z'),
('analytics_a005', 'agent_003', '2024-01-24', 234, 7, 15, 2, 0, 0, '2024-01-25T00:30:00Z'),
('analytics_a006', 'agent_004', '2024-01-24', 167, 5, 10, 2, 0, 0, '2024-01-25T00:30:00Z'),
('analytics_a007', 'agent_005', '2024-01-24', 123, 3, 7, 3, 0, 0, '2024-01-25T00:30:00Z');

-- Seed Property Analytics Daily
INSERT INTO property_analytics_daily (analytics_id, property_id, date, views, inquiries, favorites, gallery_views, map_interactions, average_time_on_page, created_at) VALUES
('analytics_p001', 'prop_001', '2024-01-24', 87, 2, 4, 45, 23, 180.5, '2024-01-25T00:30:00Z'),
('analytics_p002', 'prop_001', '2024-01-23', 92, 1, 3, 48, 21, 175.2, '2024-01-24T00:30:00Z'),
('analytics_p003', 'prop_002', '2024-01-24', 65, 2, 3, 32, 18, 156.8, '2024-01-25T00:30:00Z'),
('analytics_p004', 'prop_003', '2024-01-24', 134, 3, 6, 89, 45, 245.3, '2024-01-25T00:30:00Z'),
('analytics_p005', 'prop_004', '2024-01-24', 98, 2, 5, 67, 34, 210.7, '2024-01-25T00:30:00Z'),
('analytics_p006', 'prop_005', '2024-01-24', 54, 1, 2, 28, 15, 142.1, '2024-01-25T00:30:00Z');

-- Seed Email Logs
INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, subject, template_name, status, sent_at, opened_at, clicked_at, bounced_at, error_message, created_at) VALUES
('email_001', 'john.smith@example.com', 'user', 'user_001', 'welcome', 'Welcome to Our Real Estate Platform', 'welcome_email', 'delivered', '2024-01-15T10:01:00Z', '2024-01-15T10:15:00Z', '2024-01-15T10:20:00Z', NULL, NULL, '2024-01-15T10:00:00Z'),
('email_002', 'robert.williams@realty.com', 'agent', 'agent_001', 'inquiry_notification', 'New Inquiry on Your Listing', 'agent_inquiry_notification', 'delivered', '2024-01-22T09:16:00Z', '2024-01-22T09:30:00Z', NULL, NULL, NULL, '2024-01-22T09:15:00Z'),
('email_003', 'john.smith@example.com', 'user', 'user_001', 'agent_reply', 'Agent Response to Your Inquiry', 'inquiry_reply_notification', 'delivered', '2024-01-22T14:21:00Z', '2024-01-22T14:35:00Z', NULL, NULL, NULL, '2024-01-22T14:20:00Z'),
('email_004', 'sarah.johnson@example.com', 'user', 'user_002', 'price_alert', 'Price Drop on Your Saved Property', 'price_drop_alert', 'delivered', '2024-01-19T14:31:00Z', '2024-01-19T15:00:00Z', '2024-01-19T15:10:00Z', NULL, NULL, '2024-01-19T14:30:00Z'),
('email_005', 'jennifer.lee@homes.com', 'agent', 'agent_002', 'monthly_report', 'Your Monthly Performance Report', 'agent_monthly_report', 'delivered', '2024-01-01T08:00:00Z', '2024-01-01T09:15:00Z', NULL, NULL, NULL, '2024-01-01T08:00:00Z');

-- Seed Open Houses
INSERT INTO open_houses (open_house_id, property_id, scheduled_date, start_time, end_time, description, rsvp_count, is_active, created_at, updated_at) VALUES
('open_001', 'prop_001', '2024-01-27', '14:00', '17:00', 'Join us for an exclusive open house showcasing this stunning modern home with panoramic bay views. Light refreshments will be served.', 8, true, '2024-01-20T10:00:00Z', '2024-01-24T15:30:00Z'),
('open_002', 'prop_002', '2024-01-28', '13:00', '16:00', 'Family-friendly open house! Come see this beautiful Santa Monica home. Great opportunity to explore the neighborhood and ask questions.', 5, true, '2024-01-21T11:00:00Z', '2024-01-23T14:20:00Z'),
('open_003', 'prop_004', '2024-02-03', '12:00', '15:00', 'Exclusive waterfront estate viewing. Private dock tour included. RSVP required.', 3, true, '2024-01-23T09:00:00Z', '2024-01-24T10:15:00Z');

-- Seed Open House RSVPs
INSERT INTO open_house_rsvps (rsvp_id, open_house_id, user_id, guest_name, guest_email, guest_phone, number_of_guests, notes, status, created_at) VALUES
('rsvp_001', 'open_001', 'user_001', 'John Smith', 'john.smith@example.com', '555-0101', 1, 'Looking forward to seeing the views!', 'confirmed', '2024-01-22T10:30:00Z'),
('rsvp_002', 'open_001', 'user_006', 'Lisa Anderson', 'lisa.anderson@example.com', '555-0106', 2, 'Bringing my spouse', 'confirmed', '2024-01-22T14:15:00Z'),
('rsvp_003', 'open_001', NULL, 'Michael Thompson', 'michael.t@example.com', '555-0301', 1, NULL, 'confirmed', '2024-01-23T09:00:00Z'),
('rsvp_004', 'open_002', 'user_002', 'Sarah Johnson', 'sarah.johnson@example.com', '555-0102', 4, 'Coming with family - 2 adults, 2 kids', 'confirmed', '2024-01-22T11:30:00Z'),
('rsvp_005', 'open_002', NULL, 'Robert Palmer', 'rpalmer@example.com', '555-0302', 2, 'Interested in the school district', 'confirmed', '2024-01-23T15:45:00Z'),
('rsvp_006', 'open_003', 'user_004', 'Emma Davis', 'emma.davis@example.com', '555-0104', 1, 'Would like to see the dock facilities', 'confirmed', '2024-01-24T08:30:00Z');

-- Seed Listing Notes
INSERT INTO listing_notes (note_id, property_id, agent_id, note_type, content, is_private, created_at, updated_at) VALUES
('note_001', 'prop_001', 'agent_001', 'showing_feedback', 'Showing went well. Buyers loved the views and modern finishes. They''re considering making an offer but want to see it one more time with their architect.', true, '2024-01-23T16:00:00Z', '2024-01-23T16:00:00Z'),
('note_002', 'prop_001', 'agent_001', 'general', 'Remember to highlight the smart home features and recent renovations in all communications.', true, '2024-01-20T10:30:00Z', '2024-01-20T10:30:00Z'),
('note_003', 'prop_002', 'agent_002', 'price_strategy', 'Seller willing to consider offers $50k below asking for quick close. Don''t advertise publicly.', true, '2024-01-22T09:00:00Z', '2024-01-22T09:00:00Z'),
('note_004', 'prop_003', 'agent_003', 'showing_feedback', 'High-net-worth individual very interested. Scheduling second showing with interior designer. Strong potential buyer.', true, '2024-01-24T11:30:00Z', '2024-01-24T11:30:00Z'),
('note_005', 'prop_004', 'agent_004', 'maintenance', 'Pool service scheduled for January 26th. Landscaping crew coming on the 27th before open house.', true, '2024-01-23T14:00:00Z', '2024-01-23T14:00:00Z'),
('note_006', 'prop_007', 'agent_002', 'offer', 'Received verbal offer at $9.2M. Buyer is serious and pre-approved. Setting up formal offer presentation for next week.', true, '2024-01-25T15:00:00Z', '2024-01-25T15:00:00Z');

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_approval_status ON agents(approval_status);
CREATE INDEX idx_properties_agent_id ON properties(agent_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_listing_type ON properties(listing_type);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_city ON properties(address_city);
CREATE INDEX idx_properties_state ON properties(address_state);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_is_featured ON properties(is_featured);
CREATE INDEX idx_property_photos_property_id ON property_photos(property_id);
CREATE INDEX idx_inquiries_property_id ON inquiries(property_id);
CREATE INDEX idx_inquiries_agent_id ON inquiries(agent_id);
CREATE INDEX idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiry_replies_inquiry_id ON inquiry_replies(inquiry_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_property_id ON favorites(property_id);
CREATE INDEX idx_property_views_property_id ON property_views(property_id);
CREATE INDEX idx_property_views_user_id ON property_views(user_id);
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_open_houses_property_id ON open_houses(property_id);
CREATE INDEX idx_open_house_rsvps_open_house_id ON open_house_rsvps(open_house_id);
CREATE INDEX idx_listing_notes_property_id ON listing_notes(property_id);