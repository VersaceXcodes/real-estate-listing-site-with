import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// ============================================================================
// TYPES & INTERFACES (matching Zod schemas exactly)
// ============================================================================

// User schema (userSchema)
interface User {
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  email_verified: boolean;
  profile_photo_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

// Agent schema (agentSchema)
interface Agent {
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
  email_signature: string | null;
  approved: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  account_status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

// Admin schema (simplified)
interface Admin {
  admin_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moderator';
}

// User Notification Preferences (userNotificationPreferencesSchema)
interface UserNotificationPreferences {
  preference_id: string;
  user_id: string;
  saved_property_price_change: boolean;
  saved_property_status_change: boolean;
  new_matching_properties: boolean;
  agent_reply_received: boolean;
  platform_updates: boolean;
  created_at: string;
  updated_at: string;
}

// Agent Notification Preferences (agentNotificationPreferencesSchema)
interface AgentNotificationPreferences {
  preference_id: string;
  agent_id: string;
  new_inquiry_received: boolean;
  inquirer_replied: boolean;
  property_view_milestones: boolean;
  monthly_report: boolean;
  platform_updates: boolean;
  notification_frequency: 'instant' | 'daily' | 'weekly';
  browser_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Toast message type
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  created_at: string;
}

// ============================================================================
// MAIN APP STATE INTERFACE
// ============================================================================

interface AppState {
  // ========== AUTHENTICATION STATE ==========
  authentication_state: {
    // User (property seeker) authentication
    current_user: User | null;
    user_auth_token: string | null;
    
    // Agent authentication
    current_agent: Agent | null;
    agent_auth_token: string | null;
    
    // Admin authentication
    current_admin: Admin | null;
    admin_auth_token: string | null;
    
    // Authentication status flags
    authentication_status: {
      is_authenticated: boolean;
      is_agent_authenticated: boolean;
      is_admin_authenticated: boolean;
      is_loading: boolean;
      user_type: 'guest' | 'property_seeker' | 'agent' | 'admin';
    };
    
    error_message: string | null;
  };
  
  // ========== USER FAVORITES ==========
  user_favorites: {
    saved_properties: string[]; // Array of property_id
    is_loading: boolean;
    last_updated: string | null;
  };
  
  // ========== USER NOTIFICATION PREFERENCES ==========
  user_notification_preferences: UserNotificationPreferences | null;
  
  // ========== AGENT NOTIFICATION PREFERENCES ==========
  agent_notification_preferences: AgentNotificationPreferences | null;
  
  // ========== AGENT DASHBOARD STATE ==========
  agent_dashboard_state: {
    unread_inquiry_count: number;
    total_active_listings: number;
    is_loading: boolean;
  };
  
  // ========== UI STATE ==========
  ui_state: {
    active_modal: string | null;
    mobile_nav_open: boolean;
    toast_messages: ToastMessage[];
  };
  
  // ========== AUTHENTICATION ACTIONS ==========
  login_user: (email: string, password: string) => Promise<void>;
  login_agent: (email: string, password: string) => Promise<void>;
  login_admin: (email: string, password: string) => Promise<void>;
  register_user: (data: {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string | null;
  }) => Promise<void>;
  register_agent: (data: {
    email: string;
    password: string;
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
    [key: string]: any;
  }) => Promise<void>;
  logout: () => void;
  initialize_auth: () => Promise<void>;
  update_user_profile: (user: User) => void;
  update_agent_profile: (agent: Agent) => void;
  verify_email: (token: string) => Promise<void>;
  request_password_reset: (email: string) => Promise<void>;
  reset_password: (token: string, new_password: string) => Promise<void>;
  change_password: (current_password: string, new_password: string) => Promise<void>;
  clear_auth_error: () => void;
  
  // ========== FAVORITES ACTIONS ==========
  add_favorite: (property_id: string) => Promise<void>;
  remove_favorite: (property_id: string) => Promise<void>;
  load_favorites: () => Promise<void>;
  is_property_saved: (property_id: string) => boolean;
  
  // ========== NOTIFICATION PREFERENCES ACTIONS ==========
  load_user_notification_preferences: () => Promise<void>;
  update_user_notification_preferences: (preferences: Partial<UserNotificationPreferences>) => Promise<void>;
  load_agent_notification_preferences: () => Promise<void>;
  update_agent_notification_preferences: (preferences: Partial<AgentNotificationPreferences>) => Promise<void>;
  
  // ========== AGENT DASHBOARD ACTIONS ==========
  load_agent_dashboard_stats: () => Promise<void>;
  set_unread_inquiry_count: (count: number) => void;
  increment_unread_inquiries: () => void;
  decrement_unread_inquiries: () => void;
  
  // ========== UI ACTIONS ==========
  show_toast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  dismiss_toast: (toast_id: string) => void;
  open_modal: (modal_name: string, data?: any) => void;
  close_modal: () => void;
  toggle_mobile_nav: () => void;
}

// ============================================================================
// ZUSTAND STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ========== INITIAL STATE ==========
      
      authentication_state: {
        current_user: null,
        user_auth_token: null,
        current_agent: null,
        agent_auth_token: null,
        current_admin: null,
        admin_auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_agent_authenticated: false,
          is_admin_authenticated: false,
          is_loading: true, // Start as loading for initial auth check
          user_type: 'guest',
        },
        error_message: null,
      },
      
      user_favorites: {
        saved_properties: [],
        is_loading: false,
        last_updated: null,
      },
      
      user_notification_preferences: null,
      
      agent_notification_preferences: null,
      
      agent_dashboard_state: {
        unread_inquiry_count: 0,
        total_active_listings: 0,
        is_loading: false,
      },
      
      ui_state: {
        active_modal: null,
        mobile_nav_open: false,
        toast_messages: [],
      },
      
      // ========== AUTHENTICATION ACTIONS ==========
      
      login_user: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { user, token } = response.data;
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_user: user,
              user_auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'property_seeker',
              },
              error_message: null,
            },
          }));
          
          // Load user-specific data after login
          await get().load_favorites();
          await get().load_user_notification_preferences();
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_user: null,
              user_auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      login_agent: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/agent/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { agent, token } = response.data;
          
          // Verify agent is approved
          if (!agent.approved || agent.approval_status !== 'approved') {
            throw new Error('Agent account is not approved yet. Please wait for admin approval.');
          }
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_agent: agent,
              agent_auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_agent_authenticated: true,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'agent',
              },
              error_message: null,
            },
          }));
          
          // Load agent-specific data after login
          await get().load_agent_notification_preferences();
          await get().load_agent_dashboard_stats();
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Agent login failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_agent: null,
              agent_auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      login_admin: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/admin/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { admin, token } = response.data;
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_admin: admin,
              admin_auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_agent_authenticated: false,
                is_admin_authenticated: true,
                is_loading: false,
                user_type: 'admin',
              },
              error_message: null,
            },
          }));
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Admin login failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_admin: null,
              admin_auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      register_user: async (data) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
            data,
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { user, token } = response.data;
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_user: user,
              user_auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'property_seeker',
              },
              error_message: null,
            },
          }));
          
          // Load user data after registration
          await get().load_user_notification_preferences();
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Registration failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              current_user: null,
              user_auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      register_agent: async (data) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/agent/register`,
            data,
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { agent } = response.data;
          
          // Agent registration does NOT auto-login (pending approval)
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: null,
            },
          }));
          
          // Show success toast
          get().show_toast(
            `Application submitted! Check ${data.email} for approval notification.`,
            'success',
            5000
          );
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Agent registration failed';
          
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      logout: () => {
        // Determine current user type for API call
        const state = get();
        const { user_type } = state.authentication_state.authentication_status;
        const token = state.authentication_state.user_auth_token || 
                      state.authentication_state.agent_auth_token || 
                      state.authentication_state.admin_auth_token;
        
        // Optional: Call logout endpoint (fire-and-forget)
        if (token) {
          axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`,
            {},
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          ).catch(() => {
            // Silent fail - user logged out locally anyway
          });
        }
        
        // Clear all state
        set({
          authentication_state: {
            current_user: null,
            user_auth_token: null,
            current_agent: null,
            agent_auth_token: null,
            current_admin: null,
            admin_auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_agent_authenticated: false,
              is_admin_authenticated: false,
              is_loading: false,
              user_type: 'guest',
            },
            error_message: null,
          },
          user_favorites: {
            saved_properties: [],
            is_loading: false,
            last_updated: null,
          },
          user_notification_preferences: null,
          agent_notification_preferences: null,
          agent_dashboard_state: {
            unread_inquiry_count: 0,
            total_active_listings: 0,
            is_loading: false,
          },
        });
        
        get().show_toast('Logged out successfully', 'success');
      },
      
      initialize_auth: async () => {
        const { authentication_state } = get();
        
        // Check for stored tokens
        const user_token = authentication_state.user_auth_token;
        const agent_token = authentication_state.agent_auth_token;
        const admin_token = authentication_state.admin_auth_token;
        
        if (!user_token && !agent_token && !admin_token) {
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          return;
        }
        
        try {
          // Verify user token
          if (user_token) {
            const response = await axios.get(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
              {
                headers: {
                  'Authorization': `Bearer ${user_token}`
                }
              }
            );
            
            const user = response.data;
            
            set((state) => ({
              authentication_state: {
                ...state.authentication_state,
                current_user: user,
                user_auth_token: user_token,
                authentication_status: {
                  is_authenticated: true,
                  is_agent_authenticated: false,
                  is_admin_authenticated: false,
                  is_loading: false,
                  user_type: 'property_seeker',
                },
                error_message: null,
              },
            }));
            
            // Load user data
            await get().load_favorites();
            await get().load_user_notification_preferences();
            return;
          }
          
          // Verify agent token
          if (agent_token) {
            const response = await axios.get(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/me`,
              {
                headers: {
                  'Authorization': `Bearer ${agent_token}`
                }
              }
            );
            
            const agent = response.data;
            
            set((state) => ({
              authentication_state: {
                ...state.authentication_state,
                current_agent: agent,
                agent_auth_token: agent_token,
                authentication_status: {
                  is_authenticated: true,
                  is_agent_authenticated: true,
                  is_admin_authenticated: false,
                  is_loading: false,
                  user_type: 'agent',
                },
                error_message: null,
              },
            }));
            
            // Load agent data
            await get().load_agent_notification_preferences();
            await get().load_agent_dashboard_stats();
            return;
          }
          
          // Verify admin token (if endpoint exists)
          if (admin_token) {
            // Placeholder for admin verification
            set((state) => ({
              authentication_state: {
                ...state.authentication_state,
                authentication_status: {
                  is_authenticated: true,
                  is_agent_authenticated: false,
                  is_admin_authenticated: true,
                  is_loading: false,
                  user_type: 'admin',
                },
              },
            }));
          }
          
        } catch (error) {
          // Token invalid, clear auth state
          set((state) => ({
            authentication_state: {
              current_user: null,
              user_auth_token: null,
              current_agent: null,
              agent_auth_token: null,
              current_admin: null,
              admin_auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_agent_authenticated: false,
                is_admin_authenticated: false,
                is_loading: false,
                user_type: 'guest',
              },
              error_message: null,
            },
          }));
        }
      },
      
      update_user_profile: (user: User) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_user: user,
          },
        }));
      },
      
      update_agent_profile: (agent: Agent) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_agent: agent,
          },
        }));
      },
      
      verify_email: async (token: string) => {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/verify-email`,
            { token },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          get().show_toast('Email verified successfully!', 'success');
          
          // Optionally update user email_verified flag if auto-login
          if (response.data.token) {
            await get().initialize_auth();
          }
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Email verification failed';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      request_password_reset: async (email: string) => {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/forgot-password`,
            { email },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          get().show_toast('If an account exists, a password reset email has been sent', 'success');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Password reset request failed';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      reset_password: async (token: string, new_password: string) => {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/reset-password`,
            { token, new_password },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          get().show_toast('Password reset successfully. You can now login.', 'success');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Password reset failed';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      change_password: async (current_password: string, new_password: string) => {
        const state = get();
        const token = state.authentication_state.user_auth_token || state.authentication_state.agent_auth_token;
        
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        try {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/change-password`,
            { current_password, new_password },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          get().show_toast('Password changed successfully', 'success');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Password change failed';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },
      
      // ========== FAVORITES ACTIONS ==========
      
      add_favorite: async (property_id: string) => {
        const state = get();
        const user_id = state.authentication_state.current_user?.user_id;
        const token = state.authentication_state.user_auth_token;
        
        if (!user_id || !token) {
          throw new Error('Must be logged in to save favorites');
        }
        
        // Optimistic update
        set((state) => ({
          user_favorites: {
            ...state.user_favorites,
            saved_properties: [...state.user_favorites.saved_properties, property_id],
            last_updated: new Date().toISOString(),
          },
        }));
        
        try {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
            { property_id },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          get().show_toast('Property saved to favorites', 'success');
          
        } catch (error: any) {
          // Rollback on error
          set((state) => ({
            user_favorites: {
              ...state.user_favorites,
              saved_properties: state.user_favorites.saved_properties.filter(id => id !== property_id),
            },
          }));
          
          const errorMessage = error.response?.data?.error?.message || 'Failed to save property';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      remove_favorite: async (property_id: string) => {
        const state = get();
        const token = state.authentication_state.user_auth_token;
        
        if (!token) {
          throw new Error('Must be logged in to manage favorites');
        }
        
        // Optimistic update
        const previous_favorites = state.user_favorites.saved_properties;
        set((state) => ({
          user_favorites: {
            ...state.user_favorites,
            saved_properties: state.user_favorites.saved_properties.filter(id => id !== property_id),
            last_updated: new Date().toISOString(),
          },
        }));
        
        try {
          // Note: API uses property_id, but we need favorite_id
          // Views should pass the correct identifier
          await axios.delete(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites/${property_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          get().show_toast('Property removed from favorites', 'success');
          
        } catch (error: any) {
          // Rollback on error
          set((state) => ({
            user_favorites: {
              ...state.user_favorites,
              saved_properties: previous_favorites,
            },
          }));
          
          const errorMessage = error.response?.data?.error?.message || 'Failed to remove property';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      load_favorites: async () => {
        const state = get();
        const user_id = state.authentication_state.current_user?.user_id;
        const token = state.authentication_state.user_auth_token;
        
        if (!user_id || !token) {
          return;
        }
        
        set((state) => ({
          user_favorites: {
            ...state.user_favorites,
            is_loading: true,
          },
        }));
        
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              params: {
                limit: 1000,
                offset: 0
              }
            }
          );
          
          const property_ids = response.data.data.map((fav: any) => fav.property_id);
          
          set((state) => ({
            user_favorites: {
              saved_properties: property_ids,
              is_loading: false,
              last_updated: new Date().toISOString(),
            },
          }));
          
        } catch (error: any) {
          set((state) => ({
            user_favorites: {
              ...state.user_favorites,
              is_loading: false,
            },
          }));
          
          console.error('Failed to load favorites:', error);
        }
      },
      
      is_property_saved: (property_id: string) => {
        const state = get();
        return state.user_favorites.saved_properties.includes(property_id);
      },
      
      // ========== USER NOTIFICATION PREFERENCES ACTIONS ==========
      
      load_user_notification_preferences: async () => {
        const state = get();
        const token = state.authentication_state.user_auth_token;
        
        if (!token) {
          return;
        }
        
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/notification-preferences`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          set({ user_notification_preferences: response.data });
          
        } catch (error: any) {
          console.error('Failed to load user notification preferences:', error);
        }
      },
      
      update_user_notification_preferences: async (preferences) => {
        const state = get();
        const token = state.authentication_state.user_auth_token;
        
        if (!token || !state.user_notification_preferences) {
          throw new Error('User not authenticated or preferences not loaded');
        }
        
        // Optimistic update
        const previous_prefs = state.user_notification_preferences;
        set((state) => ({
          user_notification_preferences: state.user_notification_preferences
            ? { ...state.user_notification_preferences, ...preferences }
            : null,
        }));
        
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/notification-preferences`,
            preferences,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          set({ user_notification_preferences: response.data });
          get().show_toast('Notification preferences updated', 'success');
          
        } catch (error: any) {
          // Rollback on error
          set({ user_notification_preferences: previous_prefs });
          
          const errorMessage = error.response?.data?.error?.message || 'Failed to update preferences';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      // ========== AGENT NOTIFICATION PREFERENCES ACTIONS ==========
      
      load_agent_notification_preferences: async () => {
        const state = get();
        const token = state.authentication_state.agent_auth_token;
        
        if (!token) {
          return;
        }
        
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/notification-preferences`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          set({ agent_notification_preferences: response.data });
          
        } catch (error: any) {
          console.error('Failed to load agent notification preferences:', error);
        }
      },
      
      update_agent_notification_preferences: async (preferences) => {
        const state = get();
        const token = state.authentication_state.agent_auth_token;
        
        if (!token || !state.agent_notification_preferences) {
          throw new Error('Agent not authenticated or preferences not loaded');
        }
        
        // Optimistic update
        const previous_prefs = state.agent_notification_preferences;
        set((state) => ({
          agent_notification_preferences: state.agent_notification_preferences
            ? { ...state.agent_notification_preferences, ...preferences }
            : null,
        }));
        
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/notification-preferences`,
            preferences,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          set({ agent_notification_preferences: response.data });
          get().show_toast('Notification preferences updated', 'success');
          
        } catch (error: any) {
          // Rollback on error
          set({ agent_notification_preferences: previous_prefs });
          
          const errorMessage = error.response?.data?.error?.message || 'Failed to update preferences';
          get().show_toast(errorMessage, 'error');
          throw new Error(errorMessage);
        }
      },
      
      // ========== AGENT DASHBOARD ACTIONS ==========
      
      load_agent_dashboard_stats: async () => {
        const state = get();
        const token = state.authentication_state.agent_auth_token;
        
        if (!token) {
          return;
        }
        
        set((state) => ({
          agent_dashboard_state: {
            ...state.agent_dashboard_state,
            is_loading: true,
          },
        }));
        
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/dashboard/stats`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          set((state) => ({
            agent_dashboard_state: {
              unread_inquiry_count: response.data.unread_inquiry_count || 0,
              total_active_listings: response.data.total_active_listings || 0,
              is_loading: false,
            },
          }));
          
        } catch (error: any) {
          set((state) => ({
            agent_dashboard_state: {
              ...state.agent_dashboard_state,
              is_loading: false,
            },
          }));
          
          console.error('Failed to load agent dashboard stats:', error);
        }
      },
      
      set_unread_inquiry_count: (count: number) => {
        set((state) => ({
          agent_dashboard_state: {
            ...state.agent_dashboard_state,
            unread_inquiry_count: count,
          },
        }));
      },
      
      increment_unread_inquiries: () => {
        set((state) => ({
          agent_dashboard_state: {
            ...state.agent_dashboard_state,
            unread_inquiry_count: state.agent_dashboard_state.unread_inquiry_count + 1,
          },
        }));
      },
      
      decrement_unread_inquiries: () => {
        set((state) => ({
          agent_dashboard_state: {
            ...state.agent_dashboard_state,
            unread_inquiry_count: Math.max(0, state.agent_dashboard_state.unread_inquiry_count - 1),
          },
        }));
      },
      
      // ========== UI ACTIONS ==========
      
      show_toast: (message: string, type = 'info' as 'success' | 'error' | 'info' | 'warning', duration = 3000) => {
        const toast_id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const new_toast: ToastMessage = {
          id: toast_id,
          message,
          type,
          duration,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            toast_messages: [...state.ui_state.toast_messages, new_toast],
          },
        }));
        
        // Auto-dismiss after duration
        setTimeout(() => {
          get().dismiss_toast(toast_id);
        }, duration);
      },
      
      dismiss_toast: (toast_id: string) => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            toast_messages: state.ui_state.toast_messages.filter(t => t.id !== toast_id),
          },
        }));
      },
      
      open_modal: (modal_name: string, data?: any) => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            active_modal: modal_name,
          },
        }));
      },
      
      close_modal: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            active_modal: null,
          },
        }));
      },
      
      toggle_mobile_nav: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            mobile_nav_open: !state.ui_state.mobile_nav_open,
          },
        }));
      },
    }),
    {
      name: 'propconnect-app-storage',
      // CRITICAL: Only persist essential data
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          user_auth_token: state.authentication_state.user_auth_token,
          current_agent: state.authentication_state.current_agent,
          agent_auth_token: state.authentication_state.agent_auth_token,
          current_admin: state.authentication_state.current_admin,
          admin_auth_token: state.authentication_state.admin_auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_agent_authenticated: state.authentication_state.authentication_status.is_agent_authenticated,
            is_admin_authenticated: state.authentication_state.authentication_status.is_admin_authenticated,
            is_loading: false, // Never persist loading state
            user_type: state.authentication_state.authentication_status.user_type,
          },
          error_message: null, // Never persist errors
        },
        user_favorites: {
          saved_properties: state.user_favorites.saved_properties,
          is_loading: false,
          last_updated: state.user_favorites.last_updated,
        },
        user_notification_preferences: state.user_notification_preferences,
        agent_notification_preferences: state.agent_notification_preferences,
      }),
    }
  )
);

// ============================================================================
// EXPORT TYPES FOR VIEW COMPONENTS
// ============================================================================

export type {
  User,
  Agent,
  Admin,
  UserNotificationPreferences,
  AgentNotificationPreferences,
  ToastMessage,
  AppState,
};