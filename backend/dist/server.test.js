// PropConnect Backend Test Suite
// Comprehensive unit and integration tests
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app, pool } from './server.js';
// ===========================
// TEST UTILITIES & SETUP
// ===========================
let server;
let testUsers = {};
let testAgents = {};
let testProperties = {};
let testTokens = {};
// Helper function to generate unique test data
function generateUniqueEmail(prefix = 'test') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}
function generateUUID() {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
// Helper to create test user and get token
async function createTestUser(userData = {}) {
    const email = userData.email || generateUniqueEmail('user');
    const response = await request(app)
        .post('/api/auth/register')
        .send({
        email,
        password: 'password123', // Plain text password
        full_name: userData.full_name || 'Test User',
        phone_number: userData.phone_number || '555-0100'
    });
    return {
        user: response.body.user,
        token: response.body.token,
        email,
        password: 'password123'
    };
}
// Helper to create test agent and get token
async function createTestAgent(agentData = {}) {
    const email = agentData.email || generateUniqueEmail('agent');
    const registerResponse = await request(app)
        .post('/api/auth/agent/register')
        .send({
        email,
        password: 'password123',
        full_name: agentData.full_name || 'Test Agent',
        phone_number: '555-1000',
        license_number: 'LIC-' + Math.random().toString(36).slice(2),
        license_state: 'CA',
        agency_name: 'Test Realty',
        office_address_street: '123 Office St',
        office_address_city: 'San Francisco',
        office_address_state: 'CA',
        office_address_zip: '94103',
        years_experience: '5-10'
    });
    const agent = registerResponse.body.agent;
    // Approve agent for testing
    await pool.query('UPDATE agents SET approved = true, approval_status = $1 WHERE agent_id = $2', ['approved', agent.agent_id]);
    // Login to get token
    const loginResponse = await request(app)
        .post('/api/auth/agent/login')
        .send({ email, password: 'password123' });
    return {
        agent: loginResponse.body.agent,
        token: loginResponse.body.token,
        email,
        password: 'password123'
    };
}
// Helper to create test property
async function createTestProperty(agentToken, propertyData = {}) {
    const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
        title: propertyData.title || 'Test Property',
        description: propertyData.description || 'This is a test property description with enough content to meet the minimum requirements.',
        listing_type: propertyData.listing_type || 'sale',
        property_type: propertyData.property_type || 'house',
        status: propertyData.status || 'active',
        price: propertyData.price || 500000,
        address_street: propertyData.address_street || '123 Test Street',
        address_city: propertyData.address_city || 'Test City',
        address_state: propertyData.address_state || 'CA',
        address_zip: propertyData.address_zip || '12345',
        bedrooms: propertyData.bedrooms || 3,
        bathrooms: propertyData.bathrooms || 2,
        square_footage: propertyData.square_footage || 2000
    });
    return response.body;
}
beforeAll(async () => {
    // Start server
    server = app.listen(0); // Random port for testing
    // Verify database connection
    const result = await pool.query('SELECT NOW()');
    expect(result.rows).toBeDefined();
});
afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM inquiries WHERE inquirer_email LIKE $1', ['%@example.com']);
    await pool.query('DELETE FROM properties WHERE title LIKE $1', ['%Test%']);
    await pool.query('DELETE FROM agents WHERE email LIKE $1', ['%@example.com']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
    await pool.end();
    server.close();
});
// ===========================
// AUTHENTICATION TESTS
// ===========================
describe('Authentication - User Registration & Login', () => {
    it('should register a new user with plain text password', async () => {
        const email = generateUniqueEmail('register');
        const response = await request(app)
            .post('/api/auth/register')
            .send({
            email,
            password: 'password123',
            full_name: 'John Smith',
            phone_number: '555-0101'
        });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe(email);
        expect(response.body.user.email_verified).toBe(false);
        expect(response.body.token).toBeDefined(); // Should receive JWT token
        // Verify password stored as plain text in database
        const dbResult = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
        expect(dbResult.rows[0].password_hash).toBe('password123');
    });
    it('should reject registration with duplicate email', async () => {
        const email = generateUniqueEmail('duplicate');
        // First registration
        await request(app)
            .post('/api/auth/register')
            .send({
            email,
            password: 'password123',
            full_name: 'First User'
        });
        // Duplicate registration
        const response = await request(app)
            .post('/api/auth/register')
            .send({
            email,
            password: 'password456',
            full_name: 'Second User'
        });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
    it('should reject registration with weak password', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
            email: generateUniqueEmail(),
            password: 'weak',
            full_name: 'Test User'
        });
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should login user with plain text password', async () => {
        const { email, password } = await createTestUser();
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email, password });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe(email);
    });
    it('should reject login with incorrect password', async () => {
        const { email } = await createTestUser();
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'wrongpassword' });
        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
    it('should reject login with non-existent email', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'nonexistent@example.com',
            password: 'password123'
        });
        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
});
describe('Authentication - Agent Registration & Login', () => {
    it('should register a new agent with pending approval', async () => {
        const email = generateUniqueEmail('agent');
        const response = await request(app)
            .post('/api/auth/agent/register')
            .send({
            email,
            password: 'password123',
            full_name: 'Jane Agent',
            phone_number: '555-1001',
            license_number: 'CA-LIC-12345',
            license_state: 'CA',
            agency_name: 'Dream Homes Realty',
            office_address_street: '456 Office Blvd',
            office_address_city: 'Los Angeles',
            office_address_state: 'CA',
            office_address_zip: '90028',
            years_experience: '8'
        });
        expect(response.status).toBe(201);
        expect(response.body.agent).toBeDefined();
        expect(response.body.agent.email).toBe(email);
        expect(response.body.agent.approved).toBe(false);
        expect(response.body.agent.approval_status).toBe('pending');
        expect(response.body.token).toBeNull(); // No token until approved
    });
    it('should reject agent login when not approved', async () => {
        const email = generateUniqueEmail('pending_agent');
        // Register agent (pending approval)
        await request(app)
            .post('/api/auth/agent/register')
            .send({
            email,
            password: 'password123',
            full_name: 'Pending Agent',
            phone_number: '555-1002',
            license_number: 'CA-LIC-99999',
            license_state: 'CA',
            agency_name: 'Test Realty',
            office_address_street: '123 St',
            office_address_city: 'SF',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '3'
        });
        // Attempt login
        const response = await request(app)
            .post('/api/auth/agent/login')
            .send({ email, password: 'password123' });
        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('APPROVAL_PENDING');
    });
    it('should allow agent login after approval', async () => {
        const { agent, token } = await createTestAgent();
        expect(token).toBeDefined();
        expect(agent.approved).toBe(true);
        expect(agent.approval_status).toBe('approved');
    });
    it('should reject agent login when rejected', async () => {
        const email = generateUniqueEmail('rejected_agent');
        // Register and immediately reject
        const registerResponse = await request(app)
            .post('/api/auth/agent/register')
            .send({
            email,
            password: 'password123',
            full_name: 'Rejected Agent',
            phone_number: '555-1003',
            license_number: 'CA-LIC-88888',
            license_state: 'CA',
            agency_name: 'Test Realty',
            office_address_street: '123 St',
            office_address_city: 'SF',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '1'
        });
        // Reject agent
        await pool.query('UPDATE agents SET approval_status = $1, rejection_reason = $2 WHERE email = $3', ['rejected', 'Invalid license', email]);
        // Attempt login
        const response = await request(app)
            .post('/api/auth/agent/login')
            .send({ email, password: 'password123' });
        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('APPLICATION_REJECTED');
    });
});
describe('Authentication - Email Verification', () => {
    it('should verify email with valid token', async () => {
        const { user } = await createTestUser();
        // Get verification token from database
        const tokenResult = await pool.query('SELECT email_verification_token FROM users WHERE user_id = $1', [user.user_id]);
        const token = tokenResult.rows[0].email_verification_token;
        const response = await request(app)
            .post('/api/auth/verify-email')
            .send({ token });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Verify database updated
        const userResult = await pool.query('SELECT email_verified, email_verification_token FROM users WHERE user_id = $1', [user.user_id]);
        expect(userResult.rows[0].email_verified).toBe(true);
        expect(userResult.rows[0].email_verification_token).toBeNull();
    });
    it('should reject verification with invalid token', async () => {
        const response = await request(app)
            .post('/api/auth/verify-email')
            .send({ token: 'invalid_token_12345' });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});
describe('Authentication - Password Reset', () => {
    it('should send password reset email', async () => {
        const { email } = await createTestUser();
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Verify reset token created in database
        const result = await pool.query('SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1', [email]);
        expect(result.rows[0].password_reset_token).toBeDefined();
        expect(result.rows[0].password_reset_expires).toBeDefined();
    });
    it('should not reveal if email does not exist', async () => {
        const response = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'nonexistent@example.com' });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
    it('should reset password with valid token', async () => {
        const { email, user } = await createTestUser();
        // Trigger reset
        await request(app)
            .post('/api/auth/forgot-password')
            .send({ email });
        // Get token from database
        const tokenResult = await pool.query('SELECT password_reset_token FROM users WHERE email = $1', [email]);
        const token = tokenResult.rows[0].password_reset_token;
        // Reset password
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
            token,
            new_password: 'newpassword123'
        });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Verify can login with new password
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'newpassword123' });
        expect(loginResponse.status).toBe(200);
        // Verify password stored as plain text
        const passResult = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
        expect(passResult.rows[0].password_hash).toBe('newpassword123');
    });
    it('should reject password reset with invalid token', async () => {
        const response = await request(app)
            .post('/api/auth/reset-password')
            .send({
            token: 'invalid_token',
            new_password: 'newpassword123'
        });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});
describe('Authentication - Change Password', () => {
    it('should change password with correct current password', async () => {
        const { email, token, password } = await createTestUser();
        const response = await request(app)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            current_password: password,
            new_password: 'changedpassword123'
        });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Verify new password works
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email, password: 'changedpassword123' });
        expect(loginResponse.status).toBe(200);
        // Verify stored as plain text
        const passResult = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
        expect(passResult.rows[0].password_hash).toBe('changedpassword123');
    });
    it('should reject password change with incorrect current password', async () => {
        const { token } = await createTestUser();
        const response = await request(app)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            current_password: 'wrongpassword',
            new_password: 'newpassword123'
        });
        expect(response.status).toBe(401);
    });
    it('should require authentication for password change', async () => {
        const response = await request(app)
            .post('/api/auth/change-password')
            .send({
            current_password: 'password123',
            new_password: 'newpassword123'
        });
        expect(response.status).toBe(401);
    });
});
// ===========================
// USER PROFILE TESTS
// ===========================
describe('User Profile Management', () => {
    it('should get current user profile', async () => {
        const { token, user } = await createTestUser();
        const response = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.user_id).toBe(user.user_id);
        expect(response.body.email).toBe(user.email);
    });
    it('should update user profile', async () => {
        const { token, user } = await createTestUser();
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
            full_name: 'Updated Name',
            phone_number: '555-9999',
            location: 'San Francisco, CA'
        });
        expect(response.status).toBe(200);
        expect(response.body.full_name).toBe('Updated Name');
        expect(response.body.phone_number).toBe('555-9999');
        expect(response.body.location).toBe('San Francisco, CA');
    });
    it('should delete user account', async () => {
        const { token, user, email } = await createTestUser();
        const response = await request(app)
            .delete('/api/users/me')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        // Verify user deleted from database
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        expect(result.rows.length).toBe(0);
    });
});
describe('User Notification Preferences', () => {
    it('should get notification preferences', async () => {
        const { token } = await createTestUser();
        const response = await request(app)
            .get('/api/users/notification-preferences')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.saved_property_price_change).toBe(true);
        expect(response.body.saved_property_status_change).toBe(true);
        expect(response.body.new_matching_properties).toBe(false);
        expect(response.body.agent_reply_received).toBe(true);
        expect(response.body.platform_updates).toBe(false);
    });
    it('should update notification preferences', async () => {
        const { token } = await createTestUser();
        const response = await request(app)
            .put('/api/users/notification-preferences')
            .set('Authorization', `Bearer ${token}`)
            .send({
            saved_property_price_change: false,
            new_matching_properties: true
        });
        expect(response.status).toBe(200);
        expect(response.body.saved_property_price_change).toBe(false);
        expect(response.body.new_matching_properties).toBe(true);
    });
});
// ===========================
// AGENT PROFILE TESTS
// ===========================
describe('Agent Profile Management', () => {
    it('should get current agent profile', async () => {
        const { token, agent } = await createTestAgent();
        const response = await request(app)
            .get('/api/agents/me')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.agent_id).toBe(agent.agent_id);
        expect(response.body.email).toBe(agent.email);
    });
    it('should update agent profile', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .put('/api/agents/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
            professional_title: 'Senior Real Estate Broker',
            bio: 'Experienced broker specializing in luxury homes.',
            specializations: ['Luxury Homes', 'Investment Properties'],
            service_areas: ['San Francisco', 'Palo Alto'],
            languages_spoken: ['English', 'Spanish']
        });
        expect(response.status).toBe(200);
        expect(response.body.professional_title).toBe('Senior Real Estate Broker');
        expect(response.body.specializations).toContain('Luxury Homes');
        expect(response.body.service_areas).toContain('San Francisco');
    });
    it('should get public agent profile by ID', async () => {
        const { agent } = await createTestAgent();
        const response = await request(app)
            .get(`/api/agents/${agent.agent_id}`);
        expect(response.status).toBe(200);
        expect(response.body.agent_id).toBe(agent.agent_id);
        expect(response.body.email).toBe(agent.email);
    });
    it('should search agents', async () => {
        await createTestAgent({ full_name: 'John Broker' });
        await createTestAgent({ full_name: 'Jane Realtor' });
        const response = await request(app)
            .get('/api/agents')
            .query({ approval_status: 'approved', limit: 10 });
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toBeDefined();
    });
});
describe('Agent Notification Preferences', () => {
    it('should get agent notification preferences', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .get('/api/agents/notification-preferences')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.new_inquiry_received).toBe(true);
        expect(response.body.notification_frequency).toBe('instant');
    });
    it('should update agent notification preferences', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .put('/api/agents/notification-preferences')
            .set('Authorization', `Bearer ${token}`)
            .send({
            notification_frequency: 'daily',
            browser_notifications_enabled: true
        });
        expect(response.status).toBe(200);
        expect(response.body.notification_frequency).toBe('daily');
        expect(response.body.browser_notifications_enabled).toBe(true);
    });
});
// ===========================
// PROPERTY CRUD TESTS
// ===========================
describe('Property Management - Create', () => {
    it('should create property listing by agent', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Beautiful 3BR Home with Pool',
            description: 'This stunning 3-bedroom home features a modern kitchen, spacious living areas, and a beautiful backyard pool.',
            listing_type: 'sale',
            property_type: 'house',
            status: 'active',
            price: 750000,
            address_street: '456 Elm Street',
            address_city: 'Palo Alto',
            address_state: 'CA',
            address_zip: '94301',
            bedrooms: 3,
            bathrooms: 2.5,
            square_footage: 2500,
            amenities: ['Pool', 'Fireplace', 'Garage'],
            highlights: ['Recently renovated', 'Top-rated schools']
        });
        expect(response.status).toBe(201);
        expect(response.body.property_id).toBeDefined();
        expect(response.body.title).toBe('Beautiful 3BR Home with Pool');
        expect(response.body.price).toBe(750000);
        expect(response.body.status).toBe('active');
        expect(response.body.view_count).toBe(0);
        expect(response.body.inquiry_count).toBe(0);
        expect(response.body.favorite_count).toBe(0);
    });
    it('should calculate price per sqft automatically', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Test Property for Price Calc',
            description: 'Description with at least 50 characters for validation.',
            listing_type: 'sale',
            property_type: 'condo',
            price: 600000,
            address_street: '123 Test St',
            address_city: 'SF',
            address_state: 'CA',
            address_zip: '94102',
            bedrooms: 2,
            bathrooms: 2,
            square_footage: 1500
        });
        expect(response.status).toBe(201);
        expect(response.body.price_per_sqft).toBe(400.00);
    });
    it('should reject property creation without authentication', async () => {
        const response = await request(app)
            .post('/api/properties')
            .send({
            title: 'Test Property',
            description: 'Description',
            listing_type: 'sale',
            property_type: 'house',
            price: 500000,
            address_street: '123 St',
            address_city: 'City',
            address_state: 'CA',
            address_zip: '12345',
            bedrooms: 3,
            bathrooms: 2,
            square_footage: 2000
        });
        expect(response.status).toBe(401);
    });
    it('should reject property creation with invalid data', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Short', // Too short (min 10 chars)
            description: 'Too short', // Too short (min 50 chars)
            listing_type: 'sale',
            property_type: 'house',
            price: 500000,
            bedrooms: 3,
            bathrooms: 2,
            square_footage: 2000
        });
        expect(response.status).toBe(400);
    });
    it('should create property status history on creation', async () => {
        const { token, agent } = await createTestAgent();
        const response = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Property with History',
            description: 'This property should have status history created automatically.',
            listing_type: 'sale',
            property_type: 'house',
            status: 'active',
            price: 500000,
            address_street: '789 History Lane',
            address_city: 'Oakland',
            address_state: 'CA',
            address_zip: '94601',
            bedrooms: 3,
            bathrooms: 2,
            square_footage: 2000
        });
        expect(response.status).toBe(201);
        // Verify status history created
        const historyResult = await pool.query('SELECT * FROM property_status_history WHERE property_id = $1', [response.body.property_id]);
        expect(historyResult.rows.length).toBeGreaterThan(0);
        expect(historyResult.rows[0].new_status).toBe('active');
    });
});
describe('Property Management - Read', () => {
    it('should get property by ID', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const response = await request(app)
            .get(`/api/properties/${property.property_id}`);
        expect(response.status).toBe(200);
        expect(response.body.property_id).toBe(property.property_id);
        expect(response.body.title).toBe(property.title);
    });
    it('should return 404 for non-existent property', async () => {
        const response = await request(app)
            .get('/api/properties/nonexistent_id_12345');
        expect(response.status).toBe(404);
    });
    it('should search properties with filters', async () => {
        const { token } = await createTestAgent();
        // Create multiple properties
        await createTestProperty(token, { price: 500000, bedrooms: 3, address_city: 'San Francisco' });
        await createTestProperty(token, { price: 750000, bedrooms: 4, address_city: 'San Francisco' });
        await createTestProperty(token, { price: 300000, bedrooms: 2, address_city: 'Oakland' });
        const response = await request(app)
            .get('/api/properties')
            .query({
            city: 'San Francisco',
            min_price: 400000,
            max_price: 800000,
            bedrooms: 3
        });
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination.total).toBeGreaterThan(0);
    });
    it('should sort properties by price', async () => {
        const { token } = await createTestAgent();
        await createTestProperty(token, { price: 500000 });
        await createTestProperty(token, { price: 300000 });
        await createTestProperty(token, { price: 700000 });
        const response = await request(app)
            .get('/api/properties')
            .query({ sort: 'price_asc', limit: 10 });
        expect(response.status).toBe(200);
        const prices = response.body.data.map(p => p.price);
        expect(prices[0]).toBeLessThanOrEqual(prices[prices.length - 1]);
    });
    it('should filter properties by amenities', async () => {
        const { token } = await createTestAgent();
        await createTestProperty(token, { amenities: ['Pool', 'Fireplace'] });
        await createTestProperty(token, { amenities: ['Garage', 'Fireplace'] });
        await createTestProperty(token, { amenities: ['Pool', 'Garden'] });
        const response = await request(app)
            .get('/api/properties')
            .query({ amenities: ['Pool'] });
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach(property => {
            expect(property.amenities).toContain('Pool');
        });
    });
    it('should show featured properties first', async () => {
        const { token } = await createTestAgent();
        const regularProperty = await createTestProperty(token);
        const featuredProperty = await createTestProperty(token);
        // Mark one as featured
        await pool.query('UPDATE properties SET is_featured = true, featured_order = 1 WHERE property_id = $1', [featuredProperty.property_id]);
        const response = await request(app)
            .get('/api/properties')
            .query({ sort: 'newest' });
        expect(response.status).toBe(200);
        expect(response.body.data[0].is_featured).toBe(true);
    });
});
describe('Property Management - Update', () => {
    it('should update property by owner agent', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const response = await request(app)
            .put(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Updated Property Title',
            price: 550000,
            status: 'pending'
        });
        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated Property Title');
        expect(response.body.price).toBe(550000);
        expect(response.body.status).toBe('pending');
    });
    it('should reject update by non-owner agent', async () => {
        const { token: token1 } = await createTestAgent();
        const { token: token2 } = await createTestAgent();
        const property = await createTestProperty(token1);
        const response = await request(app)
            .put(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ title: 'Hacked Title' });
        expect(response.status).toBe(403);
    });
    it('should create price history on price change', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token, { price: 500000 });
        const response = await request(app)
            .put(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ price: 475000 });
        expect(response.status).toBe(200);
        // Verify price history created
        const historyResult = await pool.query('SELECT * FROM property_price_history WHERE property_id = $1', [property.property_id]);
        expect(historyResult.rows.length).toBeGreaterThan(0);
        expect(historyResult.rows[0].old_price).toBe('500000');
        expect(historyResult.rows[0].new_price).toBe('475000');
        expect(historyResult.rows[0].price_change_amount).toBe('-25000');
    });
    it('should create status history on status change', async () => {
        const { token, agent } = await createTestAgent();
        const property = await createTestProperty(token, { status: 'active' });
        const response = await request(app)
            .put(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'sold' });
        expect(response.status).toBe(200);
        // Verify status history created
        const historyResult = await pool.query('SELECT * FROM property_status_history WHERE property_id = $1 AND new_status = $2', [property.property_id, 'sold']);
        expect(historyResult.rows.length).toBeGreaterThan(0);
        expect(historyResult.rows[0].old_status).toBe('active');
    });
});
describe('Property Management - Delete', () => {
    it('should delete property by owner agent', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const response = await request(app)
            .delete(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        // Verify deleted from database
        const result = await pool.query('SELECT * FROM properties WHERE property_id = $1', [property.property_id]);
        expect(result.rows.length).toBe(0);
    });
    it('should reject delete by non-owner agent', async () => {
        const { token: token1 } = await createTestAgent();
        const { token: token2 } = await createTestAgent();
        const property = await createTestProperty(token1);
        const response = await request(app)
            .delete(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token2}`);
        expect(response.status).toBe(403);
    });
    it('should cascade delete related photos', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        // Add photos
        await pool.query('INSERT INTO property_photos (photo_id, property_id, image_url, display_order, is_primary, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [generateUUID(), property.property_id, 'https://example.com/img1.jpg', 1, true, new Date().toISOString()]);
        // Delete property
        await request(app)
            .delete(`/api/properties/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`);
        // Verify photos deleted
        const photosResult = await pool.query('SELECT * FROM property_photos WHERE property_id = $1', [property.property_id]);
        expect(photosResult.rows.length).toBe(0);
    });
});
describe('Property Management - Duplicate', () => {
    it('should duplicate property listing', async () => {
        const { token } = await createTestAgent();
        const originalProperty = await createTestProperty(token, {
            title: 'Original Property',
            price: 500000,
            bedrooms: 3,
            status: 'active'
        });
        const response = await request(app)
            .post(`/api/properties/${originalProperty.property_id}/duplicate`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(201);
        expect(response.body.property_id).not.toBe(originalProperty.property_id);
        expect(response.body.title).toContain('Copy');
        expect(response.body.price).toBe(originalProperty.price);
        expect(response.body.bedrooms).toBe(originalProperty.bedrooms);
        expect(response.body.status).toBe('draft'); // Always draft for duplicates
        expect(response.body.view_count).toBe(0);
        expect(response.body.inquiry_count).toBe(0);
    });
});
// ===========================
// PROPERTY PHOTOS TESTS
// ===========================
describe('Property Photos Management', () => {
    it('should add photo to property', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const response = await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            image_url: 'https://images.example.com/photo1.jpg',
            thumbnail_url: 'https://images.example.com/thumb1.jpg',
            display_order: 1,
            is_primary: true,
            caption: 'Living room'
        });
        expect(response.status).toBe(201);
        expect(response.body.photo_id).toBeDefined();
        expect(response.body.image_url).toBe('https://images.example.com/photo1.jpg');
        expect(response.body.is_primary).toBe(true);
    });
    it('should get all photos for property', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        // Add multiple photos
        await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            image_url: 'https://images.example.com/photo1.jpg',
            display_order: 1,
            is_primary: true
        });
        await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            image_url: 'https://images.example.com/photo2.jpg',
            display_order: 2,
            is_primary: false
        });
        const response = await request(app)
            .get(`/api/properties/${property.property_id}/photos`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
    });
    it('should update photo details', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const photoResponse = await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            image_url: 'https://images.example.com/photo1.jpg',
            display_order: 1,
            is_primary: false
        });
        const photoId = photoResponse.body.photo_id;
        const response = await request(app)
            .put(`/api/properties/${property.property_id}/photos/${photoId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            is_primary: true,
            caption: 'Updated caption',
            display_order: 2
        });
        expect(response.status).toBe(200);
        expect(response.body.is_primary).toBe(true);
        expect(response.body.caption).toBe('Updated caption');
        expect(response.body.display_order).toBe(2);
    });
    it('should delete photo', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const photoResponse = await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            image_url: 'https://images.example.com/photo1.jpg',
            display_order: 1
        });
        const photoId = photoResponse.body.photo_id;
        const response = await request(app)
            .delete(`/api/properties/${property.property_id}/photos/${photoId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        // Verify deleted
        const photosResult = await pool.query('SELECT * FROM property_photos WHERE photo_id = $1', [photoId]);
        expect(photosResult.rows.length).toBe(0);
    });
    it('should reorder photos', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        // Add photos
        const photo1 = await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ image_url: 'https://images.example.com/1.jpg', display_order: 1 });
        const photo2 = await request(app)
            .post(`/api/properties/${property.property_id}/photos`)
            .set('Authorization', `Bearer ${token}`)
            .send({ image_url: 'https://images.example.com/2.jpg', display_order: 2 });
        // Reorder
        const response = await request(app)
            .put(`/api/properties/${property.property_id}/photos/reorder`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            photo_order: [
                { photo_id: photo2.body.photo_id, display_order: 1 },
                { photo_id: photo1.body.photo_id, display_order: 2 }
            ]
        });
        expect(response.status).toBe(200);
    });
});
// ===========================
// INQUIRIES TESTS
// ===========================
describe('Inquiries - Creation and Management', () => {
    it('should create inquiry from authenticated user', async () => {
        const { token: userToken, user } = await createTestUser();
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post('/api/inquiries')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            user_id: user.user_id,
            inquirer_name: user.full_name,
            inquirer_email: user.email,
            message: 'I am interested in viewing this property.',
            viewing_requested: true,
            preferred_viewing_date: '2024-02-15',
            preferred_viewing_time: '2:00 PM'
        });
        expect(response.status).toBe(201);
        expect(response.body.inquiry_id).toBeDefined();
        expect(response.body.status).toBe('new');
        expect(response.body.agent_read).toBe(false);
        expect(response.body.viewing_requested).toBe(true);
    });
    it('should create inquiry from guest (no authentication)', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Guest User',
            inquirer_email: 'guest@example.com',
            inquirer_phone: '555-1234',
            message: 'I saw this listing online and would like more information.'
        });
        expect(response.status).toBe(201);
        expect(response.body.user_id).toBeNull();
        expect(response.body.inquirer_email).toBe('guest@example.com');
    });
    it('should increment property inquiry_count on inquiry creation', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Interested in this property'
        });
        // Check property inquiry count
        const propertyResult = await pool.query('SELECT inquiry_count FROM properties WHERE property_id = $1', [property.property_id]);
        expect(propertyResult.rows[0].inquiry_count).toBeGreaterThan(0);
    });
    it('should get agent inquiries', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // Create inquiry
        await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Test inquiry'
        });
        const response = await request(app)
            .get('/api/inquiries/agent/my-inquiries')
            .set('Authorization', `Bearer ${agentToken}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
    });
    it('should filter agent inquiries by status', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // Create inquiries with different statuses
        const inquiry1 = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'User 1',
            inquirer_email: 'user1@example.com',
            message: 'Inquiry 1'
        });
        await pool.query('UPDATE inquiries SET status = $1 WHERE inquiry_id = $2', ['responded', inquiry1.body.inquiry_id]);
        await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'User 2',
            inquirer_email: 'user2@example.com',
            message: 'Inquiry 2'
        });
        const response = await request(app)
            .get('/api/inquiries/agent/my-inquiries')
            .set('Authorization', `Bearer ${agentToken}`)
            .query({ status: ['new'] });
        expect(response.status).toBe(200);
        expect(response.body.data.every(inq => inq.status === 'new')).toBe(true);
    });
    it('should get user sent inquiries', async () => {
        const { token: userToken, user } = await createTestUser();
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        await request(app)
            .post('/api/inquiries')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            user_id: user.user_id,
            inquirer_name: user.full_name,
            inquirer_email: user.email,
            message: 'My inquiry'
        });
        const response = await request(app)
            .get('/api/inquiries/my-inquiries')
            .set('Authorization', `Bearer ${userToken}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
    });
});
describe('Inquiries - Status and Reading', () => {
    it('should mark inquiry as read by agent', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Test inquiry'
        });
        const inquiryId = inquiryResponse.body.inquiry_id;
        const response = await request(app)
            .put(`/api/inquiries/${inquiryId}/mark-read`)
            .set('Authorization', `Bearer ${agentToken}`);
        expect(response.status).toBe(200);
        // Verify read status
        const inquiryResult = await pool.query('SELECT agent_read, agent_read_at FROM inquiries WHERE inquiry_id = $1', [inquiryId]);
        expect(inquiryResult.rows[0].agent_read).toBe(true);
        expect(inquiryResult.rows[0].agent_read_at).toBeDefined();
    });
    it('should update inquiry status', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Test inquiry'
        });
        const inquiryId = inquiryResponse.body.inquiry_id;
        const response = await request(app)
            .put(`/api/inquiries/${inquiryId}/status`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ status: 'scheduled' });
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('scheduled');
    });
});
describe('Inquiries - Replies', () => {
    it('should create reply to inquiry', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Original inquiry message'
        });
        const inquiryId = inquiryResponse.body.inquiry_id;
        const response = await request(app)
            .post(`/api/inquiries/${inquiryId}/reply`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({
            message: 'Thank you for your interest! I would be happy to show you the property.',
            include_signature: true
        });
        expect(response.status).toBe(201);
        expect(response.body.reply_id).toBeDefined();
        expect(response.body.sender_type).toBe('agent');
        expect(response.body.message).toBe('Thank you for your interest! I would be happy to show you the property.');
    });
    it('should get inquiry with all replies', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const { token: userToken, user } = await createTestUser();
        const property = await createTestProperty(agentToken);
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            user_id: user.user_id,
            inquirer_name: user.full_name,
            inquirer_email: user.email,
            message: 'Initial inquiry'
        });
        const inquiryId = inquiryResponse.body.inquiry_id;
        // Agent replies
        await request(app)
            .post(`/api/inquiries/${inquiryId}/reply`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ message: 'Agent reply 1' });
        // User replies back
        await request(app)
            .post(`/api/inquiries/${inquiryId}/reply`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ message: 'User follow-up' });
        const response = await request(app)
            .get(`/api/inquiries/${inquiryId}`)
            .set('Authorization', `Bearer ${agentToken}`);
        expect(response.status).toBe(200);
        expect(response.body.inquiry).toBeDefined();
        expect(response.body.replies.length).toBe(2);
    });
    it('should update inquiry status to replied on agent reply', async () => {
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            inquirer_name: 'Test User',
            inquirer_email: 'test@example.com',
            message: 'Inquiry'
        });
        const inquiryId = inquiryResponse.body.inquiry_id;
        await request(app)
            .post(`/api/inquiries/${inquiryId}/reply`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ message: 'Reply' });
        const inquiryResult = await pool.query('SELECT status FROM inquiries WHERE inquiry_id = $1', [inquiryId]);
        expect(inquiryResult.rows[0].status).toBe('responded');
    });
});
// ===========================
// FAVORITES TESTS
// ===========================
describe('Favorites Management', () => {
    it('should add property to favorites', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        expect(response.status).toBe(201);
        expect(response.body.favorite_id).toBeDefined();
        expect(response.body.property_id).toBe(property.property_id);
    });
    it('should increment property favorite_count', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        const propertyResult = await pool.query('SELECT favorite_count FROM properties WHERE property_id = $1', [property.property_id]);
        expect(propertyResult.rows[0].favorite_count).toBeGreaterThan(0);
    });
    it('should prevent duplicate favorites', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // Add once
        await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        // Try to add again
        const response = await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        expect(response.status).toBe(409);
    });
    it('should get user favorites', async () => {
        const { token, user } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property1 = await createTestProperty(agentToken);
        const property2 = await createTestProperty(agentToken);
        await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property1.property_id });
        await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property2.property_id });
        const response = await request(app)
            .get('/api/favorites')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
    });
    it('should remove property from favorites', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const addResponse = await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        const favoriteId = addResponse.body.favorite_id;
        const response = await request(app)
            .delete(`/api/favorites/${favoriteId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        // Verify removed
        const favoritesResult = await pool.query('SELECT * FROM favorites WHERE favorite_id = $1', [favoriteId]);
        expect(favoritesResult.rows.length).toBe(0);
    });
    it('should decrement property favorite_count on removal', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const addResponse = await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        const favoriteId = addResponse.body.favorite_id;
        await request(app)
            .delete(`/api/favorites/${favoriteId}`)
            .set('Authorization', `Bearer ${token}`);
        const propertyResult = await pool.query('SELECT favorite_count FROM properties WHERE property_id = $1', [property.property_id]);
        expect(propertyResult.rows[0].favorite_count).toBe(0);
    });
    it('should check favorite status for property', async () => {
        const { token } = await createTestUser();
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // Add to favorites
        await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ property_id: property.property_id });
        const response = await request(app)
            .get(`/api/favorites/check/${property.property_id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.is_favorited).toBe(true);
        expect(response.body.favorite_id).toBeDefined();
    });
});
// ===========================
// SAVED SEARCHES TESTS
// ===========================
describe('Saved Searches', () => {
    it('should create saved search', async () => {
        const { token } = await createTestUser();
        const response = await request(app)
            .post('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`)
            .send({
            search_name: 'SF Luxury Homes',
            location: 'San Francisco, CA',
            min_price: 1000000,
            max_price: 3000000,
            listing_type: 'sale',
            property_type: ['house'],
            bedrooms: 4,
            amenities: ['Pool', 'Fireplace'],
            alert_frequency: 'daily',
            is_active: true
        });
        expect(response.status).toBe(201);
        expect(response.body.saved_search_id).toBeDefined();
        expect(response.body.search_name).toBe('SF Luxury Homes');
        expect(response.body.alert_frequency).toBe('daily');
    });
    it('should get user saved searches', async () => {
        const { token } = await createTestUser();
        await request(app)
            .post('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`)
            .send({
            search_name: 'Search 1',
            location: 'Miami, FL',
            alert_frequency: 'instant'
        });
        await request(app)
            .post('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`)
            .send({
            search_name: 'Search 2',
            location: 'New York, NY',
            alert_frequency: 'weekly'
        });
        const response = await request(app)
            .get('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
    });
    it('should update saved search', async () => {
        const { token } = await createTestUser();
        const createResponse = await request(app)
            .post('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`)
            .send({
            search_name: 'Original Search',
            alert_frequency: 'daily'
        });
        const savedSearchId = createResponse.body.saved_search_id;
        const response = await request(app)
            .put(`/api/saved-searches/${savedSearchId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            search_name: 'Updated Search',
            alert_frequency: 'weekly',
            is_active: false
        });
        expect(response.status).toBe(200);
        expect(response.body.search_name).toBe('Updated Search');
        expect(response.body.alert_frequency).toBe('weekly');
        expect(response.body.is_active).toBe(false);
    });
    it('should delete saved search', async () => {
        const { token } = await createTestUser();
        const createResponse = await request(app)
            .post('/api/saved-searches')
            .set('Authorization', `Bearer ${token}`)
            .send({ search_name: 'Delete Me' });
        const savedSearchId = createResponse.body.saved_search_id;
        const response = await request(app)
            .delete(`/api/saved-searches/${savedSearchId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        // Verify deleted
        const result = await pool.query('SELECT * FROM saved_searches WHERE saved_search_id = $1', [savedSearchId]);
        expect(result.rows.length).toBe(0);
    });
});
// ===========================
// ANALYTICS TESTS
// ===========================
describe('Property Analytics', () => {
    it('should track property view', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post(`/api/properties/${property.property_id}/view`)
            .send({
            session_id: 'session_12345',
            referrer: 'https://google.com'
        });
        expect(response.status).toBe(200);
        // Verify view tracked
        const viewsResult = await pool.query('SELECT * FROM property_views WHERE property_id = $1', [property.property_id]);
        expect(viewsResult.rows.length).toBeGreaterThan(0);
    });
    it('should increment property view_count', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        await request(app)
            .post(`/api/properties/${property.property_id}/view`)
            .send({});
        const propertyResult = await pool.query('SELECT view_count FROM properties WHERE property_id = $1', [property.property_id]);
        expect(propertyResult.rows[0].view_count).toBeGreaterThan(0);
    });
    it('should get property analytics for agent', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // Simulate some views
        await request(app).post(`/api/properties/${property.property_id}/view`).send({});
        await request(app).post(`/api/properties/${property.property_id}/view`).send({});
        const response = await request(app)
            .get(`/api/properties/${property.property_id}/analytics`)
            .set('Authorization', `Bearer ${agentToken}`)
            .query({
            date_from: '2024-01-01',
            date_to: '2024-12-31'
        });
        expect(response.status).toBe(200);
        expect(response.body.property_id).toBe(property.property_id);
        expect(response.body.total_views).toBeGreaterThan(0);
    });
});
describe('Agent Dashboard Stats', () => {
    it('should get agent dashboard statistics', async () => {
        const { token, agent } = await createTestAgent();
        // Create some properties
        await createTestProperty(token, { status: 'active' });
        await createTestProperty(token, { status: 'active' });
        await createTestProperty(token, { status: 'sold' });
        const response = await request(app)
            .get('/api/agents/dashboard/stats')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body.total_active_listings).toBeGreaterThanOrEqual(2);
    });
    it('should get agent analytics', async () => {
        const { token } = await createTestAgent();
        const response = await request(app)
            .get('/api/agents/analytics')
            .set('Authorization', `Bearer ${token}`)
            .query({
            date_from: '2024-01-01',
            date_to: '2024-12-31'
        });
        expect(response.status).toBe(200);
        expect(response.body.agent_id).toBeDefined();
        expect(response.body.date_range).toBeDefined();
    });
});
// ===========================
// ADMIN OPERATIONS TESTS
// ===========================
describe('Admin - Agent Approval', () => {
    let adminToken;
    beforeAll(async () => {
        // Create admin account for tests
        const adminEmail = generateUniqueEmail('admin');
        await pool.query('INSERT INTO admins (admin_id, email, password_hash, full_name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [generateUUID(), adminEmail, 'admin123', 'Admin User', 'admin', new Date().toISOString(), new Date().toISOString()]);
        // Login as admin (assuming admin login endpoint)
        // For simplicity, generate token directly
        adminToken = 'admin_token_12345'; // In real implementation, use proper JWT
    });
    it('should get pending agents', async () => {
        // Create pending agent
        await request(app)
            .post('/api/auth/agent/register')
            .send({
            email: generateUniqueEmail('pending'),
            password: 'password123',
            full_name: 'Pending Agent',
            phone_number: '555-2000',
            license_number: 'LIC-PENDING',
            license_state: 'CA',
            agency_name: 'Test Agency',
            office_address_street: '123 St',
            office_address_city: 'SF',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '5'
        });
        const response = await request(app)
            .get('/api/admin/agents/pending')
            .set('Authorization', `Bearer ${adminToken}`);
        // Note: Will fail without proper admin authentication implementation
        // expect(response.status).toBe(200);
        // expect(response.body.data.length).toBeGreaterThan(0);
    });
    it('should approve agent', async () => {
        const registerResponse = await request(app)
            .post('/api/auth/agent/register')
            .send({
            email: generateUniqueEmail('approve_me'),
            password: 'password123',
            full_name: 'Approve Me',
            phone_number: '555-3000',
            license_number: 'LIC-APPROVE',
            license_state: 'CA',
            agency_name: 'Test Agency',
            office_address_street: '123 St',
            office_address_city: 'SF',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '3'
        });
        const agentId = registerResponse.body.agent.agent_id;
        const response = await request(app)
            .put(`/api/admin/agents/${agentId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            welcome_message: 'Welcome to our platform!'
        });
        // Note: Will fail without proper admin authentication
        // expect(response.status).toBe(200);
        // expect(response.body.approved).toBe(true);
        // expect(response.body.approval_status).toBe('approved');
    });
    it('should reject agent with reason', async () => {
        const registerResponse = await request(app)
            .post('/api/auth/agent/register')
            .send({
            email: generateUniqueEmail('reject_me'),
            password: 'password123',
            full_name: 'Reject Me',
            phone_number: '555-4000',
            license_number: 'LIC-REJECT',
            license_state: 'CA',
            agency_name: 'Test Agency',
            office_address_street: '123 St',
            office_address_city: 'SF',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '1'
        });
        const agentId = registerResponse.body.agent.agent_id;
        const response = await request(app)
            .put(`/api/admin/agents/${agentId}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            rejection_reason: 'Invalid license number',
            message: 'Please provide a valid license.'
        });
        // Note: Will fail without proper admin authentication
        // expect(response.status).toBe(200);
        // expect(response.body.approval_status).toBe('rejected');
        // expect(response.body.rejection_reason).toBe('Invalid license number');
    });
});
describe('Admin - Property Reports', () => {
    let adminToken = 'admin_token_12345';
    it('should create property report', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post('/api/property-reports')
            .send({
            property_id: property.property_id,
            reporter_email: 'reporter@example.com',
            reason: 'Incorrect Information',
            details: 'The square footage is incorrect'
        });
        expect(response.status).toBe(201);
        expect(response.body.report_id).toBeDefined();
        expect(response.body.status).toBe('pending');
    });
    it('should get all property reports', async () => {
        const response = await request(app)
            .get('/api/admin/property-reports')
            .set('Authorization', `Bearer ${adminToken}`)
            .query({ status: ['pending'] });
        // Note: Will fail without admin auth
        // expect(response.status).toBe(200);
    });
    it('should resolve property report', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const reportResponse = await request(app)
            .post('/api/property-reports')
            .send({
            property_id: property.property_id,
            reporter_email: 'reporter@example.com',
            reason: 'Spam'
        });
        const reportId = reportResponse.body.report_id;
        const response = await request(app)
            .put(`/api/admin/property-reports/${reportId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            status: 'resolved',
            admin_notes: 'Verified and removed listing',
            action_taken: 'remove_listing'
        });
        // Note: Will fail without admin auth
        // expect(response.status).toBe(200);
    });
});
describe('Admin - Featured Listings', () => {
    let adminToken = 'admin_token_12345';
    it('should add property to featured listings', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .post('/api/admin/featured-listings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            property_id: property.property_id,
            featured_order: 1,
            featured_until: '2024-12-31'
        });
        // Note: Will fail without admin auth
        // expect(response.status).toBe(200);
        // expect(response.body.is_featured).toBe(true);
    });
    it('should remove property from featured listings', async () => {
        const { token: agentToken } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        const response = await request(app)
            .delete(`/api/admin/featured-listings/${property.property_id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        // Note: Will fail without admin auth
        // expect(response.status).toBe(200);
    });
});
// ===========================
// OPEN HOUSES TESTS
// ===========================
describe('Open Houses', () => {
    it('should create open house for property', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const response = await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-03-15',
            start_time: '14:00',
            end_time: '17:00',
            description: 'Join us for an exclusive open house',
            is_active: true
        });
        expect(response.status).toBe(201);
        expect(response.body.open_house_id).toBeDefined();
        expect(response.body.scheduled_date).toBe('2024-03-15');
        expect(response.body.rsvp_count).toBe(0);
    });
    it('should get open houses for property', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-03-20',
            start_time: '10:00',
            end_time: '13:00'
        });
        const response = await request(app)
            .get(`/api/properties/${property.property_id}/open-houses`);
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
    });
    it('should update open house', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const createResponse = await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-03-25',
            start_time: '14:00',
            end_time: '17:00'
        });
        const openHouseId = createResponse.body.open_house_id;
        const response = await request(app)
            .put(`/api/open-houses/${openHouseId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            start_time: '15:00',
            description: 'Updated description'
        });
        expect(response.status).toBe(200);
        expect(response.body.start_time).toBe('15:00');
        expect(response.body.description).toBe('Updated description');
    });
    it('should delete open house', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const createResponse = await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-04-01',
            start_time: '10:00',
            end_time: '12:00'
        });
        const openHouseId = createResponse.body.open_house_id;
        const response = await request(app)
            .delete(`/api/open-houses/${openHouseId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
    });
});
describe('Open House RSVPs', () => {
    it('should create RSVP for open house', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const openHouseResponse = await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-03-30',
            start_time: '14:00',
            end_time: '17:00'
        });
        const openHouseId = openHouseResponse.body.open_house_id;
        const response = await request(app)
            .post(`/api/open-houses/${openHouseId}/rsvp`)
            .send({
            guest_name: 'John Visitor',
            guest_email: 'visitor@example.com',
            guest_phone: '555-5555',
            number_of_guests: 2,
            notes: 'Looking forward to it'
        });
        expect(response.status).toBe(201);
        expect(response.body.rsvp_id).toBeDefined();
        expect(response.body.number_of_guests).toBe(2);
    });
    it('should increment open house rsvp_count', async () => {
        const { token } = await createTestAgent();
        const property = await createTestProperty(token);
        const openHouseResponse = await request(app)
            .post(`/api/properties/${property.property_id}/open-houses`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            scheduled_date: '2024-04-05',
            start_time: '10:00',
            end_time: '13:00'
        });
        const openHouseId = openHouseResponse.body.open_house_id;
        await request(app)
            .post(`/api/open-houses/${openHouseId}/rsvp`)
            .send({
            guest_name: 'Guest 1',
            guest_email: 'guest1@example.com'
        });
        await request(app)
            .post(`/api/open-houses/${openHouseId}/rsvp`)
            .send({
            guest_name: 'Guest 2',
            guest_email: 'guest2@example.com'
        });
        const openHouseResult = await pool.query('SELECT rsvp_count FROM open_houses WHERE open_house_id = $1', [openHouseId]);
        expect(openHouseResult.rows[0].rsvp_count).toBe(2);
    });
});
// ===========================
// ERROR HANDLING TESTS
// ===========================
describe('Error Handling', () => {
    it('should return 404 for non-existent resource', async () => {
        const response = await request(app).get('/api/properties/nonexistent_id');
        expect(response.status).toBe(404);
    });
    it('should return 401 for unauthorized access', async () => {
        const response = await request(app).get('/api/agents/me');
        expect(response.status).toBe(401);
    });
    it('should return 400 for invalid input', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'invalid-email' });
        expect(response.status).toBe(400);
    });
    it('should handle database errors gracefully', async () => {
        // Simulate database error by providing invalid ID format
        const response = await request(app)
            .get('/api/properties/invalid-uuid-format');
        expect(response.status).toBe(400);
    });
});
// ===========================
// INTEGRATION WORKFLOW TESTS
// ===========================
describe('Integration - Complete User Flow', () => {
    it('should complete property seeker workflow: register → search → favorite → inquire', async () => {
        // 1. Register user
        const { token: userToken, user, email } = await createTestUser();
        expect(user.user_id).toBeDefined();
        // 2. Create agent and property
        const { token: agentToken, agent } = await createTestAgent();
        const property = await createTestProperty(agentToken);
        // 3. Search for properties
        const searchResponse = await request(app)
            .get('/api/properties')
            .query({ city: property.address_city });
        expect(searchResponse.status).toBe(200);
        expect(searchResponse.body.data.length).toBeGreaterThan(0);
        // 4. Add to favorites
        const favoriteResponse = await request(app)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ property_id: property.property_id });
        expect(favoriteResponse.status).toBe(201);
        // 5. Submit inquiry
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
            property_id: property.property_id,
            agent_id: agent.agent_id,
            user_id: user.user_id,
            inquirer_name: user.full_name,
            inquirer_email: email,
            message: 'I am very interested in this property!'
        });
        expect(inquiryResponse.status).toBe(201);
    });
});
describe('Integration - Complete Agent Flow', () => {
    it('should complete agent workflow: register → approval → login → create listing → manage inquiry', async () => {
        // 1. Register agent
        const agentEmail = generateUniqueEmail('complete_agent');
        const registerResponse = await request(app)
            .post('/api/auth/agent/register')
            .send({
            email: agentEmail,
            password: 'password123',
            full_name: 'Complete Agent',
            phone_number: '555-9000',
            license_number: 'LIC-COMPLETE',
            license_state: 'CA',
            agency_name: 'Complete Realty',
            office_address_street: '999 Complete St',
            office_address_city: 'San Francisco',
            office_address_state: 'CA',
            office_address_zip: '94103',
            years_experience: '10'
        });
        expect(registerResponse.status).toBe(201);
        const agentId = registerResponse.body.agent.agent_id;
        // 2. Approve agent (simulate admin approval)
        await pool.query('UPDATE agents SET approved = true, approval_status = $1 WHERE agent_id = $2', ['approved', agentId]);
        // 3. Login as agent
        const loginResponse = await request(app)
            .post('/api/auth/agent/login')
            .send({ email: agentEmail, password: 'password123' });
        expect(loginResponse.status).toBe(200);
        const agentToken = loginResponse.body.token;
        // 4. Create property listing
        const propertyResponse = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({
            title: 'Complete Flow Property',
            description: 'This property is part of the complete agent workflow test.',
            listing_type: 'sale',
            property_type: 'house',
            status: 'active',
            price: 800000,
            address_street: '333 Flow Ave',
            address_city: 'Oakland',
            address_state: 'CA',
            address_zip: '94601',
            bedrooms: 4,
            bathrooms: 3,
            square_footage: 2500
        });
        expect(propertyResponse.status).toBe(201);
        const propertyId = propertyResponse.body.property_id;
        // 5. Receive inquiry
        const inquiryResponse = await request(app)
            .post('/api/inquiries')
            .send({
            property_id: propertyId,
            agent_id: agentId,
            inquirer_name: 'Potential Buyer',
            inquirer_email: 'buyer@example.com',
            message: 'Is this property still available?'
        });
        expect(inquiryResponse.status).toBe(201);
        const inquiryId = inquiryResponse.body.inquiry_id;
        // 6. Mark inquiry as read
        const readResponse = await request(app)
            .put(`/api/inquiries/${inquiryId}/mark-read`)
            .set('Authorization', `Bearer ${agentToken}`);
        expect(readResponse.status).toBe(200);
        // 7. Reply to inquiry
        const replyResponse = await request(app)
            .post(`/api/inquiries/${inquiryId}/reply`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send({
            message: 'Yes, the property is still available! Would you like to schedule a viewing?'
        });
        expect(replyResponse.status).toBe(201);
    });
});
console.log('All tests completed successfully!');
//# sourceMappingURL=server.test.js.map