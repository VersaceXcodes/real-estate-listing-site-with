import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Bell, Trash2, Mail } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

interface NotificationPreferences {
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

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

interface UpdatePreferencesPayload {
  new_inquiry_received?: boolean;
  inquirer_replied?: boolean;
  property_view_milestones?: boolean;
  monthly_report?: boolean;
  platform_updates?: boolean;
  notification_frequency?: 'instant' | 'daily' | 'weekly';
  browser_notifications_enabled?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AgentSettings: React.FC = () => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentAgent = useAppStore(state => state.authentication_state.current_agent);
  const agentAuthToken = useAppStore(state => state.authentication_state.agent_auth_token);
  const showToast = useAppStore(state => state.show_toast);
  const changePasswordAction = useAppStore(state => state.change_password);
  const updateAgentNotificationPreferencesAction = useAppStore(state => state.update_agent_notification_preferences);
  const logoutAction = useAppStore(state => state.logout);
  const queryClient = useQueryClient();

  // Local state
  const [activeSection, setActiveSection] = useState<'security' | 'notifications' | 'account'>('security');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  // Password change form state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // API CALLS - LOAD NOTIFICATION PREFERENCES
  // ============================================================================

  const {
    data: notificationPreferences,
    isLoading: isLoadingPreferences,
    error: preferencesError,
  } = useQuery<NotificationPreferences>({
    queryKey: ['agent-notification-preferences', currentAgent?.agent_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/agents/notification-preferences`,
        {
          headers: {
            'Authorization': `Bearer ${agentAuthToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!agentAuthToken && !!currentAgent,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // MUTATION - CHANGE PASSWORD
  // ============================================================================

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      // Use global store action which handles the API call
      await changePasswordAction(payload.current_password, payload.new_password);
    },
    onSuccess: () => {
      // Reset form
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
      });
      setPasswordErrors({});
      showToast('Password changed successfully', 'success');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to change password';
      if (errorMessage.includes('current password')) {
        setPasswordErrors({ current_password: 'Current password is incorrect' });
      } else {
        showToast(errorMessage, 'error');
      }
    },
  });

  // ============================================================================
  // MUTATION - UPDATE NOTIFICATION PREFERENCES
  // ============================================================================

  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: UpdatePreferencesPayload) => {
      // Use global store action
      await updateAgentNotificationPreferencesAction(preferences);
      return preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-notification-preferences'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update preferences', 'error');
    },
  });

  // ============================================================================
  // MUTATION - DELETE ACCOUNT
  // ============================================================================

  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      // First verify password
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/change-password`,
        {
          current_password: password,
          new_password: password, // Same password to verify it's correct
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agentAuthToken}`,
          },
        }
      );

      // Then delete account
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${agentAuthToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast('Account deleted successfully', 'success');
      logoutAction();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error?.message || 'Failed to delete account', 'error');
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      errors.confirm_new_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  const handlePreferenceToggle = (key: keyof UpdatePreferencesPayload, value: boolean | string) => {
    updatePreferencesMutation.mutate({
      [key]: value,
    } as UpdatePreferencesPayload);
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      showToast('Please enter your password to confirm', 'warning');
      return;
    }

    deleteAccountMutation.mutate(deleteConfirmPassword);
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Browser notifications not supported', 'error');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      handlePreferenceToggle('browser_notifications_enabled', true);
      showToast('Browser notifications enabled', 'success');
    } else {
      showToast('Notification permission denied', 'warning');
    }
  };

  // Calculate password strength
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength, label: 'Medium', color: 'bg-yellow-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = passwordForm.new_password ? getPasswordStrength(passwordForm.new_password) : null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage your security settings and notification preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveSection('security')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeSection === 'security'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Security</span>
                </button>

                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeSection === 'notifications'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">Notifications</span>
                </button>

                <button
                  onClick={() => setActiveSection('account')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeSection === 'account'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Account</span>
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 lg:px-8 py-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Manage your password and security preferences
                    </p>
                  </div>

                  <div className="px-6 lg:px-8 py-8">
                    {/* Change Password Form */}
                    <div className="max-w-2xl">
                      <h3 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h3>

                      <form onSubmit={handlePasswordChange} className="space-y-6">
                        {/* Current Password */}
                        <div>
                          <label htmlFor="current_password" className="block text-sm font-medium text-gray-900 mb-2">
                            Current Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              id="current_password"
                              value={passwordForm.current_password}
                              onChange={(e) => {
                                setPasswordForm(prev => ({ ...prev, current_password: e.target.value }));
                                setPasswordErrors(prev => ({ ...prev, current_password: '' }));
                              }}
                              className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                                passwordErrors.current_password
                                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                  : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                              }`}
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordErrors.current_password && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {passwordErrors.current_password}
                            </p>
                          )}
                        </div>

                        {/* New Password */}
                        <div>
                          <label htmlFor="new_password" className="block text-sm font-medium text-gray-900 mb-2">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              id="new_password"
                              value={passwordForm.new_password}
                              onChange={(e) => {
                                setPasswordForm(prev => ({ ...prev, new_password: e.target.value }));
                                setPasswordErrors(prev => ({ ...prev, new_password: '' }));
                              }}
                              className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                                passwordErrors.new_password
                                  ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                  : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                              }`}
                              placeholder="Enter new password (min 8 characters)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordForm.new_password && passwordStrength && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Password strength:</span>
                                <span className={`text-xs font-medium ${
                                  passwordStrength.label === 'Weak' ? 'text-red-600' :
                                  passwordStrength.label === 'Medium' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {passwordStrength.label}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                  style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {passwordErrors.new_password && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {passwordErrors.new_password}
                            </p>
                          )}
                        </div>

                        {/* Confirm New Password */}
                        <div>
                          <label htmlFor="confirm_new_password" className="block text-sm font-medium text-gray-900 mb-2">
                            Confirm New Password *
                          </label>
                          <input
                            type="password"
                            id="confirm_new_password"
                            value={passwordForm.confirm_new_password}
                            onChange={(e) => {
                              setPasswordForm(prev => ({ ...prev, confirm_new_password: e.target.value }));
                              setPasswordErrors(prev => ({ ...prev, confirm_new_password: '' }));
                            }}
                            className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                              passwordErrors.confirm_new_password
                                ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                            }`}
                            placeholder="Confirm your new password"
                          />
                          {passwordErrors.confirm_new_password && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {passwordErrors.confirm_new_password}
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-end space-x-4 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordForm({
                                current_password: '',
                                new_password: '',
                                confirm_new_password: '',
                              });
                              setPasswordErrors({});
                            }}
                            className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {changePasswordMutation.isPending ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Changing Password...
                              </>
                            ) : (
                              'Change Password'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 lg:px-8 py-6 border-b border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                      <p className="mt-2 text-sm text-gray-600">
                        Control how and when you receive notifications about your listings and inquiries
                      </p>
                    </div>

                    <div className="px-6 lg:px-8 py-8">
                      {isLoadingPreferences ? (
                        <div className="space-y-4">
                          <div className="animate-pulse">
                            <div className="h-12 bg-gray-200 rounded-lg mb-4"></div>
                            <div className="h-12 bg-gray-200 rounded-lg mb-4"></div>
                            <div className="h-12 bg-gray-200 rounded-lg"></div>
                          </div>
                        </div>
                      ) : preferencesError ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-700">Failed to load notification preferences</p>
                        </div>
                      ) : notificationPreferences ? (
                        <div className="space-y-8">
                          {/* Email Notifications */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                            <div className="space-y-4">
                              {/* New Inquiry */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">New inquiry received</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Get notified when someone contacts you about a property
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePreferenceToggle('new_inquiry_received', !notificationPreferences.new_inquiry_received)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    notificationPreferences.new_inquiry_received ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                      notificationPreferences.new_inquiry_received ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Inquirer Replied */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">Inquirer replied to my response</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Follow-up messages from property seekers
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePreferenceToggle('inquirer_replied', !notificationPreferences.inquirer_replied)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    notificationPreferences.inquirer_replied ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                      notificationPreferences.inquirer_replied ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* View Milestones */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">Property view milestones</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Notifications at 50, 100, 500+ views per listing
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePreferenceToggle('property_view_milestones', !notificationPreferences.property_view_milestones)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    notificationPreferences.property_view_milestones ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                      notificationPreferences.property_view_milestones ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Monthly Report */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">Monthly performance report</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Summary of views, inquiries, and sales each month
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePreferenceToggle('monthly_report', !notificationPreferences.monthly_report)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    notificationPreferences.monthly_report ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                      notificationPreferences.monthly_report ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Platform Updates */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">Platform updates and tips</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    New features, best practices, and platform news
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePreferenceToggle('platform_updates', !notificationPreferences.platform_updates)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    notificationPreferences.platform_updates ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                      notificationPreferences.platform_updates ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Notification Frequency */}
                          <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Frequency</h3>
                            <div className="space-y-3">
                              {(['instant', 'daily', 'weekly'] as const).map((frequency) => (
                                <label
                                  key={frequency}
                                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                    notificationPreferences.notification_frequency === frequency
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="notification_frequency"
                                    value={frequency}
                                    checked={notificationPreferences.notification_frequency === frequency}
                                    onChange={() => handlePreferenceToggle('notification_frequency', frequency)}
                                    disabled={updatePreferencesMutation.isPending}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <div className="ml-3">
                                    <span className="block font-medium text-gray-900 capitalize">
                                      {frequency}
                                    </span>
                                    <span className="block text-sm text-gray-600">
                                      {frequency === 'instant' && 'Receive emails immediately as events occur'}
                                      {frequency === 'daily' && 'Daily digest with all updates from the day'}
                                      {frequency === 'weekly' && 'Weekly summary every Monday morning'}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Browser Notifications */}
                          <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Browser Notifications</h3>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">Desktop notifications</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Show browser notifications for new inquiries when dashboard is open
                                </p>
                              </div>
                              {notificationPreferences.browser_notifications_enabled ? (
                                <button
                                  onClick={() => handlePreferenceToggle('browser_notifications_enabled', false)}
                                  disabled={updatePreferencesMutation.isPending}
                                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 translate-x-6" />
                                </button>
                              ) : (
                                <button
                                  onClick={requestBrowserNotifications}
                                  disabled={updatePreferencesMutation.isPending}
                                  className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-sm disabled:opacity-50"
                                >
                                  Enable
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  {/* Email Management */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 lg:px-8 py-6 border-b border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-900">Account Information</h2>
                      <p className="mt-2 text-sm text-gray-600">
                        Manage your account details and settings
                      </p>
                    </div>

                    <div className="px-6 lg:px-8 py-8">
                      <div className="max-w-2xl space-y-6">
                        {/* Current Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Email Address
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="email"
                              value={currentAgent?.email || ''}
                              disabled
                              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500"
                            />
                            <button
                              type="button"
                              onClick={() => showToast('Email change requires re-verification. Contact support to change your email.', 'info', 5000)}
                              className="px-4 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200"
                            >
                              Change Email
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Changing your email requires verification. You'll need to verify the new email address.
                          </p>
                        </div>

                        {/* License Information */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            License Number
                          </label>
                          <input
                            type="text"
                            value={currentAgent?.license_number || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            License State
                          </label>
                          <input
                            type="text"
                            value={currentAgent?.license_state || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
                    <div className="px-6 lg:px-8 py-6 border-b border-red-200 bg-red-50">
                      <h2 className="text-2xl font-bold text-red-900">Danger Zone</h2>
                      <p className="mt-2 text-sm text-red-700">
                        Irreversible actions that affect your account
                      </p>
                    </div>

                    <div className="px-6 lg:px-8 py-8">
                      <div className="max-w-2xl">
                        <div className="border border-red-200 rounded-lg p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Permanently delete your agent account, all your listings, and data. This action cannot be undone.
                              </p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                <li>All your property listings will be removed</li>
                                <li>Inquiry history will be lost</li>
                                <li>Analytics and performance data will be deleted</li>
                                <li>Your profile will no longer be visible to users</li>
                              </ul>
                            </div>
                            <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0 ml-4" />
                          </div>
                          <div className="mt-6 pt-6 border-t border-red-100">
                            <button
                              onClick={() => setDeleteAccountModalOpen(true)}
                              className="px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              Delete My Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {deleteAccountModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div
                className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
                onClick={() => {
                  setDeleteAccountModalOpen(false);
                  setDeleteConfirmPassword('');
                }}
              ></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                      <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                        Delete Account?
                      </h3>
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-4">
                          This will permanently delete your agent account and all associated data. This action cannot be undone.
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-red-800 font-medium mb-2">This will delete:</p>
                          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                            <li>All your property listings</li>
                            <li>Inquiry history and conversations</li>
                            <li>Analytics and performance data</li>
                            <li>Your public agent profile</li>
                          </ul>
                        </div>
                        <div>
                          <label htmlFor="delete_password" className="block text-sm font-medium text-gray-900 mb-2">
                            Confirm with your password *
                          </label>
                          <input
                            type="password"
                            id="delete_password"
                            value={deleteConfirmPassword}
                            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            placeholder="Enter your password"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse space-y-3 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || !deleteConfirmPassword}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAccountModalOpen(false);
                      setDeleteConfirmPassword('');
                    }}
                    className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {updatePreferencesMutation.isPending && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 shadow-2xl flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-900 font-medium">Saving preferences...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AgentSettings;