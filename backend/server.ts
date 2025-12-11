import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';

// Type extensions for Express Request
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    full_name: string;
    email_verified: boolean;
  };
  agent?: {
    agent_id: string;
    email: string;
    full_name: string;
    approved: boolean;
    account_status: string;
  };
  admin?: {
    admin_id: string;
    email: string;
    full_name: string;
    role: string;
  };
  userType?: 'user' | 'agent' | 'admin';
}

interface DecodedToken extends JwtPayload {
  user_id?: string;
  agent_id?: string;
  admin_id?: string;
}
import { 
  loginInputSchema,
  registerUserInputSchema,
  registerAgentInputSchema,
  changePasswordInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
  updateUserInputSchema,
  updateAgentInputSchema,
  createPropertyInputSchema,
  updatePropertyInputSchema,
  searchPropertyInputSchema,
  createPropertyPhotoInputSchema,
  updatePropertyPhotoInputSchema,
  createInquiryInputSchema,
  updateInquiryInputSchema,
  createInquiryReplyInputSchema,
  createFavoriteInputSchema,
  createPropertyReportInputSchema,
  updatePropertyReportInputSchema,
  createSavedSearchInputSchema,
  updateSavedSearchInputSchema,
  createOpenHouseInputSchema,
  updateOpenHouseInputSchema,
  createOpenHouseRsvpInputSchema
} from './schema.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key', PORT = 3000 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

const app = express();

const isDist = path.basename(__dirname) === 'dist';
const publicDir = isDist
  ? path.resolve(__dirname, '..', 'public')
  : path.resolve(__dirname, 'public');

app.use(express.static(publicDir));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

function createErrorResponse(message: string, error: any = null, errorCode: string = 'INTERNAL_ERROR') {
  const response: any = {
    success: false,
    message,
    error_code: errorCode,
    timestamp: new Date().toISOString()
  };
  if (error && process.env.NODE_ENV === 'development') {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return response;
}

const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    if (decoded.user_id) {
      const result = await pool.query(
        'SELECT user_id, email, full_name, email_verified FROM users WHERE user_id = $1',
        [decoded.user_id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json(createErrorResponse('Invalid token', null, 'INVALID_TOKEN'));
      }
      req.user = result.rows[0];
      req.userType = 'user';
    } else if (decoded.agent_id) {
      const result = await pool.query(
        'SELECT agent_id, email, full_name, approved, account_status FROM agents WHERE agent_id = $1',
        [decoded.agent_id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json(createErrorResponse('Invalid token', null, 'INVALID_TOKEN'));
      }
      req.agent = result.rows[0];
      req.userType = 'agent';
    } else if (decoded.admin_id) {
      const result = await pool.query(
        'SELECT admin_id, email, full_name, role FROM admins WHERE admin_id = $1',
        [decoded.admin_id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json(createErrorResponse('Invalid token', null, 'INVALID_TOKEN'));
      }
      req.admin = result.rows[0];
      req.userType = 'admin';
    }
    
    next();
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error as Error, 'AUTH_TOKEN_INVALID'));
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const validated = registerUserInputSchema.parse(req.body);
    
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [validated.email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json(createErrorResponse('User with this email already exists', null, 'EMAIL_ALREADY_EXISTS'));
    }

    const user_id = uuidv4();
    const email_verification_token = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO users (user_id, email, password_hash, full_name, phone_number, email_verified, 
       email_verification_token, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8) RETURNING *`,
      [user_id, validated.email.toLowerCase(), validated.password, validated.full_name, 
       validated.phone_number || null, email_verification_token, now, now]
    );

    await pool.query(
      `INSERT INTO user_notification_preferences (preference_id, user_id, saved_property_price_change, 
       saved_property_status_change, new_matching_properties, agent_reply_received, platform_updates, 
       created_at, updated_at) VALUES ($1, $2, true, true, false, true, false, $3, $4)`,
      [uuidv4(), user_id, now, now]
    );

    await pool.query(
      `INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, 
       subject, template_name, status, created_at) VALUES ($1, $2, 'user', $3, 'email_verification', 
       'Verify Your Email Address', 'email_verification', 'pending', $4)`,
      [uuidv4(), validated.email, user_id, now]
    );

    const token = jwt.sign({ user_id }, JWT_SECRET, { expiresIn: '7d' });

    const user = result.rows[0];
    delete user.password_hash;
    delete user.email_verification_token;

    res.status(201).json({
      success: true,
      token,
      user,
      agent: null,
      error: null
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation error', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const validated = loginInputSchema.parse(req.body);
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password_hash = $2',
      [validated.email.toLowerCase(), validated.password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        token: null,
        user: null,
        agent: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const user = result.rows[0];
    const token = jwt.sign({ user_id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE users SET updated_at = $1 WHERE user_id = $2`,
      [now, user.user_id]
    );

    delete user.password_hash;
    delete user.email_verification_token;
    delete user.password_reset_token;
    delete user.password_reset_expires;

    res.json({
      success: true,
      token,
      user,
      agent: null,
      error: null
    });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/agent/register', async (req, res) => {
  try {
    const validated = registerAgentInputSchema.parse(req.body);
    
    const existingAgent = await pool.query('SELECT agent_id FROM agents WHERE email = $1', [validated.email.toLowerCase()]);
    if (existingAgent.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Agent with this email already exists', null, 'EMAIL_ALREADY_EXISTS'));
    }

    const agent_id = uuidv4();
    const email_verification_token = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO agents (agent_id, email, password_hash, full_name, phone_number, license_number, 
       license_state, agency_name, office_address_street, office_address_city, office_address_state, 
       office_address_zip, years_experience, approved, approval_status, email_verified, 
       email_verification_token, account_status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, 'pending', false, $14, 'active', $15, $16) 
       RETURNING *`,
      [agent_id, validated.email.toLowerCase(), validated.password, validated.full_name, validated.phone_number,
       validated.license_number, validated.license_state, validated.agency_name, validated.office_address_street,
       validated.office_address_city, validated.office_address_state, validated.office_address_zip,
       validated.years_experience, email_verification_token, now, now]
    );

    await pool.query(
      `INSERT INTO agent_notification_preferences (preference_id, agent_id, new_inquiry_received, 
       inquirer_replied, property_view_milestones, monthly_report, platform_updates, 
       notification_frequency, browser_notifications_enabled, created_at, updated_at) 
       VALUES ($1, $2, true, true, true, true, false, 'instant', false, $3, $4)`,
      [uuidv4(), agent_id, now, now]
    );

    await pool.query(
      `INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, 
       subject, template_name, status, created_at) VALUES ($1, $2, 'agent', $3, 'email_verification', 
       'Verify Your Email Address', 'agent_email_verification', 'pending', $4)`,
      [uuidv4(), validated.email, agent_id, now]
    );

    const agent = result.rows[0];
    delete agent.password_hash;
    delete agent.email_verification_token;

    res.status(201).json({
      success: true,
      token: null,
      user: null,
      agent,
      error: null
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation error', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/agent/login', async (req, res) => {
  try {
    const validated = loginInputSchema.parse(req.body);
    
    const result = await pool.query(
      'SELECT * FROM agents WHERE email = $1 AND password_hash = $2',
      [validated.email.toLowerCase(), validated.password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        token: null,
        user: null,
        agent: null,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const agent = result.rows[0];

    if (!agent.approved || agent.approval_status !== 'approved') {
      return res.status(401).json({
        success: false,
        token: null,
        user: null,
        agent: null,
        error: { code: 'APPROVAL_PENDING', message: 'Your application is under review' }
      });
    }

    if (agent.account_status !== 'active') {
      return res.status(401).json({
        success: false,
        token: null,
        user: null,
        agent: null,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended' }
      });
    }

    const token = jwt.sign({ agent_id: agent.agent_id }, JWT_SECRET, { expiresIn: '30d' });

    delete agent.password_hash;
    delete agent.email_verification_token;
    delete agent.password_reset_token;
    delete agent.password_reset_expires;

    res.json({
      success: true,
      token,
      user: null,
      agent,
      error: null
    });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const validated = verifyEmailInputSchema.parse(req.body);
    const now = new Date().toISOString();
    
    const userResult = await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, updated_at = $1 WHERE email_verification_token = $2 AND email_verified = false RETURNING *',
      [now, validated.token]
    );

    if (userResult.rows.length > 0) {
      return res.json({ success: true, message: 'Email verified successfully' });
    }

    const agentResult = await pool.query(
      'UPDATE agents SET email_verified = true, email_verification_token = NULL, updated_at = $1 WHERE email_verification_token = $2 AND email_verified = false RETURNING *',
      [now, validated.token]
    );

    if (agentResult.rows.length > 0) {
      return res.json({ success: true, message: 'Email verified successfully' });
    }

    res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const reset_token = uuidv4();
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    let found = false;

    const userResult = await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = $3 WHERE email = $4 RETURNING user_id, email',
      [reset_token, expires_at, now, email.toLowerCase()]
    );

    if (userResult.rows.length > 0) {
      found = true;
      await pool.query(
        `INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, subject, status, created_at) 
         VALUES ($1, $2, 'user', $3, 'password_reset', 'Reset Your Password', 'pending', $4)`,
        [uuidv4(), email, userResult.rows[0].user_id, now]
      );
    }

    if (!found) {
      const agentResult = await pool.query(
        'UPDATE agents SET password_reset_token = $1, password_reset_expires = $2, updated_at = $3 WHERE email = $4 RETURNING agent_id, email',
        [reset_token, expires_at, now, email.toLowerCase()]
      );
      if (agentResult.rows.length > 0) {
        found = true;
        await pool.query(
          `INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, subject, status, created_at) 
           VALUES ($1, $2, 'agent', $3, 'password_reset', 'Reset Your Password', 'pending', $4)`,
          [uuidv4(), email, agentResult.rows[0].agent_id, now]
        );
      }
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const validated = resetPasswordInputSchema.parse(req.body);
    const now = new Date().toISOString();

    const userResult = await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = $2 
       WHERE password_reset_token = $3 AND password_reset_expires > $4 RETURNING user_id`,
      [validated.new_password, now, validated.token, now]
    );

    if (userResult.rows.length > 0) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userResult.rows[0].user_id]);
      return res.json({ success: true, message: 'Password reset successfully' });
    }

    const agentResult = await pool.query(
      `UPDATE agents SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = $2 
       WHERE password_reset_token = $3 AND password_reset_expires > $4 RETURNING agent_id`,
      [validated.new_password, now, validated.token, now]
    );

    if (agentResult.rows.length > 0) {
      await pool.query('DELETE FROM agent_sessions WHERE agent_id = $1', [agentResult.rows[0].agent_id]);
      return res.json({ success: true, message: 'Password reset successfully' });
    }

    res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = changePasswordInputSchema.parse(req.body);
    const now = new Date().toISOString();

    if (req.userType === 'user' && req.user) {
      const result = await pool.query(
        'SELECT user_id FROM users WHERE user_id = $1 AND password_hash = $2',
        [req.user.user_id, validated.current_password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3',
        [validated.new_password, now, req.user.user_id]
      );
    } else if (req.userType === 'agent' && req.agent) {
      const result = await pool.query(
        'SELECT agent_id FROM agents WHERE agent_id = $1 AND password_hash = $2',
        [req.agent.agent_id, validated.current_password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      await pool.query(
        'UPDATE agents SET password_hash = $1, updated_at = $2 WHERE agent_id = $3',
        [validated.new_password, now, req.agent.agent_id]
      );
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('Access denied', null, 'FORBIDDEN'));
    }

    const result = await pool.query(
      'SELECT user_id, email, full_name, phone_number, email_verified, profile_photo_url, location, created_at, updated_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.put('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('Access denied', null, 'FORBIDDEN'));
    }

    const validated = updateUserInputSchema.parse({ ...req.body, user_id: req.user.user_id });
    const now = new Date().toISOString();

    const updates = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validated.full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(validated.full_name);
    }
    if (validated.phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(validated.phone_number);
    }
    if (validated.profile_photo_url !== undefined) {
      updates.push(`profile_photo_url = $${paramCount++}`);
      values.push(validated.profile_photo_url);
    }
    if (validated.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(validated.location);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(req.user.user_id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING user_id, email, full_name, phone_number, email_verified, profile_photo_url, location, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/users/notification-preferences', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('Access denied', null, 'FORBIDDEN'));
    }

    const result = await pool.query(
      'SELECT * FROM user_notification_preferences WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Notification preferences not found', null, 'NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.delete('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('Access denied', null, 'FORBIDDEN'));
    }

    await pool.query('DELETE FROM user_notification_preferences WHERE user_id = $1', [req.user.user_id]);
    await pool.query('DELETE FROM saved_searches WHERE user_id = $1', [req.user.user_id]);
    
    const favorites = await pool.query('SELECT property_id FROM favorites WHERE user_id = $1', [req.user.user_id]);
    for (const fav of favorites.rows) {
      await pool.query('UPDATE properties SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE property_id = $1', [fav.property_id]);
    }
    await pool.query('DELETE FROM favorites WHERE user_id = $1', [req.user.user_id]);
    
    await pool.query('UPDATE inquiries SET user_id = NULL WHERE user_id = $1', [req.user.user_id]);
    await pool.query('UPDATE property_views SET user_id = NULL WHERE user_id = $1', [req.user.user_id]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.user.user_id]);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    const validated = searchPropertyInputSchema.parse(req.query);
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    conditions.push(`p.status IN ('active', 'pending')`);

    if (validated.query) {
      conditions.push(`(LOWER(p.title) LIKE $${paramCount} OR LOWER(p.description) LIKE $${paramCount})`);
      values.push(`%${validated.query.toLowerCase()}%`);
      paramCount++;
    }

    if (validated.listing_type) {
      conditions.push(`p.listing_type = $${paramCount}`);
      values.push(validated.listing_type);
      paramCount++;
    }

    if (validated.property_type && validated.property_type.length > 0) {
      conditions.push(`p.property_type = ANY($${paramCount})`);
      values.push(validated.property_type);
      paramCount++;
    }

    if (validated.min_price !== undefined) {
      conditions.push(`p.price >= $${paramCount}`);
      values.push(validated.min_price);
      paramCount++;
    }

    if (validated.max_price !== undefined) {
      conditions.push(`p.price <= $${paramCount}`);
      values.push(validated.max_price);
      paramCount++;
    }

    if (validated.city) {
      conditions.push(`LOWER(p.address_city) = $${paramCount}`);
      values.push(validated.city.toLowerCase());
      paramCount++;
    }

    if (validated.state) {
      conditions.push(`p.address_state = $${paramCount}`);
      values.push(validated.state.toUpperCase());
      paramCount++;
    }

    if (validated.bedrooms !== undefined) {
      conditions.push(`p.bedrooms >= $${paramCount}`);
      values.push(validated.bedrooms);
      paramCount++;
    }

    if (validated.bathrooms !== undefined) {
      conditions.push(`p.bathrooms >= $${paramCount}`);
      values.push(validated.bathrooms);
      paramCount++;
    }

    if (validated.min_sqft !== undefined) {
      conditions.push(`p.square_footage >= $${paramCount}`);
      values.push(validated.min_sqft);
      paramCount++;
    }

    if (validated.max_sqft !== undefined) {
      conditions.push(`p.square_footage <= $${paramCount}`);
      values.push(validated.max_sqft);
      paramCount++;
    }

    if (validated.furnished !== undefined) {
      conditions.push(`p.furnished = $${paramCount}`);
      values.push(validated.furnished);
      paramCount++;
    }

    if (validated.pet_friendly !== undefined) {
      conditions.push(`p.pet_friendly = $${paramCount}`);
      values.push(validated.pet_friendly);
      paramCount++;
    }

    if (validated.is_featured !== undefined) {
      conditions.push(`p.is_featured = $${paramCount}`);
      values.push(validated.is_featured);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (validated.sort_by === 'price' && validated.sort_order === 'asc') orderBy = 'p.price ASC';
    else if (validated.sort_by === 'price' && validated.sort_order === 'desc') orderBy = 'p.price DESC';
    else if (validated.sort_by === 'square_footage' && validated.sort_order === 'desc') orderBy = 'p.square_footage DESC';
    else if (validated.sort_by === 'view_count') orderBy = 'p.view_count DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM properties p ${whereClause}`,
      values
    );

    const result = await pool.query(
      `SELECT p.*, pp.image_url as thumbnail_url, a.full_name as agent_name, a.agency_name
       FROM properties p
       LEFT JOIN property_photos pp ON p.property_id = pp.property_id AND pp.is_primary = true
       LEFT JOIN agents a ON p.agent_id = a.agent_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, validated.limit, validated.offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: validated.limit,
        offset: validated.offset,
        has_more: validated.offset + validated.limit < parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/properties', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'agent' || !req.agent) {
      return res.status(403).json(createErrorResponse('Agent access required', null, 'FORBIDDEN'));
    }

    if (!req.agent.approved || req.agent.account_status !== 'active') {
      return res.status(403).json(createErrorResponse('Agent account must be approved', null, 'AGENT_NOT_APPROVED'));
    }

    const validated = createPropertyInputSchema.parse(req.body);
    const property_id = uuidv4();
    const now = new Date().toISOString();
    const price_per_sqft = validated.price / validated.square_footage;
    const published_at = validated.status === 'active' ? now : null;

    const result = await pool.query(
      `INSERT INTO properties (
        property_id, agent_id, title, description, listing_type, property_type, status, price, currency,
        price_per_sqft, rent_frequency, address_street, address_unit, address_city, address_state,
        address_zip, address_country, latitude, longitude, neighborhood, bedrooms, bathrooms,
        square_footage, lot_size, lot_size_unit, year_built, property_style, floors, parking_spaces,
        parking_type, hoa_fee, hoa_frequency, property_tax, mls_number, interior_features,
        exterior_features, appliances_included, utilities_systems, security_features,
        community_amenities, amenities, additional_features, highlights, furnished, pet_friendly,
        new_construction, recently_renovated, virtual_tour_available, open_house_scheduled,
        price_reduced, youtube_video_url, virtual_tour_url, view_count, inquiry_count,
        favorite_count, is_featured, created_at, updated_at, published_at, days_on_market
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, 0, 0, 0, false,
        $54, $55, $56, 0
      ) RETURNING *`,
      [
        property_id, req.agent.agent_id, validated.title, validated.description, validated.listing_type,
        validated.property_type, validated.status, validated.price, validated.currency, price_per_sqft,
        validated.rent_frequency, validated.address_street, validated.address_unit, validated.address_city,
        validated.address_state, validated.address_zip, validated.address_country, validated.latitude,
        validated.longitude, validated.neighborhood, validated.bedrooms, validated.bathrooms,
        validated.square_footage, validated.lot_size, validated.lot_size_unit, validated.year_built,
        validated.property_style, validated.floors, validated.parking_spaces, validated.parking_type,
        validated.hoa_fee, validated.hoa_frequency, validated.property_tax, validated.mls_number,
        JSON.stringify(validated.interior_features || []), JSON.stringify(validated.exterior_features || []),
        JSON.stringify(validated.appliances_included || []), JSON.stringify(validated.utilities_systems || []),
        JSON.stringify(validated.security_features || []), JSON.stringify(validated.community_amenities || []),
        JSON.stringify(validated.amenities || []), JSON.stringify(validated.additional_features || []),
        JSON.stringify(validated.highlights || []), validated.furnished, validated.pet_friendly,
        validated.new_construction, validated.recently_renovated, validated.virtual_tour_available,
        validated.open_house_scheduled, validated.price_reduced, validated.youtube_video_url,
        validated.virtual_tour_url, now, now, published_at
      ]
    );

    await pool.query(
      `INSERT INTO property_status_history (history_id, property_id, old_status, new_status, changed_by_agent_id, notes, changed_at)
       VALUES ($1, $2, 'draft', $3, $4, 'Property created', $5)`,
      [uuidv4(), property_id, validated.status, req.agent.agent_id, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation error', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/properties/:property_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, a.full_name as agent_name, a.agency_name, a.phone_number as agent_phone, a.email as agent_email
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.agent_id
       WHERE p.property_id = $1`,
      [req.params.property_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Property not found', null, 'NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const validated = createInquiryInputSchema.parse(req.body);
    const inquiry_id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO inquiries (
        inquiry_id, property_id, agent_id, user_id, inquirer_name, inquirer_email, inquirer_phone,
        message, viewing_requested, preferred_viewing_date, preferred_viewing_time, status,
        agent_read, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', false, $12, $13) RETURNING *`,
      [
        inquiry_id, validated.property_id, validated.agent_id, validated.user_id, validated.inquirer_name,
        validated.inquirer_email, validated.inquirer_phone, validated.message, validated.viewing_requested,
        validated.preferred_viewing_date, validated.preferred_viewing_time, now, now
      ]
    );

    await pool.query(
      'UPDATE properties SET inquiry_count = inquiry_count + 1 WHERE property_id = $1',
      [validated.property_id]
    );

    await pool.query(
      `INSERT INTO email_logs (log_id, recipient_email, recipient_type, recipient_id, email_type, subject, status, created_at)
       VALUES ($1, (SELECT email FROM agents WHERE agent_id = $2), 'agent', $2, 'new_inquiry', 'New Inquiry Received', 'pending', $3)`,
      [uuidv4(), validated.agent_id, now]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/favorites', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('User access required', null, 'FORBIDDEN'));
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT f.*, p.* 
       FROM favorites f 
       JOIN properties p ON f.property_id = p.property_id 
       WHERE f.user_id = $1 
       ORDER BY f.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/favorites', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userType !== 'user' || !req.user) {
      return res.status(403).json(createErrorResponse('User access required', null, 'FORBIDDEN'));
    }

    const validated = createFavoriteInputSchema.parse(req.body);
    const favorite_id = uuidv4();
    const now = new Date().toISOString();

    const existing = await pool.query(
      'SELECT favorite_id FROM favorites WHERE user_id = $1 AND property_id = $2',
      [req.user.user_id, validated.property_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json(createErrorResponse('Property already in favorites', null, 'ALREADY_EXISTS'));
    }

    const result = await pool.query(
      'INSERT INTO favorites (favorite_id, user_id, property_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [favorite_id, req.user.user_id, validated.property_id, now]
    );

    await pool.query(
      'UPDATE properties SET favorite_count = favorite_count + 1 WHERE property_id = $1',
      [validated.property_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error', error as Error, 'INTERNAL_SERVER_ERROR'));
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

export { app, pool };

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});