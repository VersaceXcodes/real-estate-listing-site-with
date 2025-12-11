import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { User, EyeOff, Eye, Mail, Phone, MapPin, Bell, Lock, Trash2, Camera, Save, X, Check, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface UserProfile {
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

interface ProfileEditForm {
  full_name: string;
  phone_number: string;
  location: string;
}

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface NotificationPreferences {
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_UserAccount: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ========== ZUSTAND STATE ACCESS (Individual Selectors) ==========
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const userAuthToken = useAppStore(state => state.authentication_state.user_auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const updateUserProfileGlobal = useAppStore(state => state.update_user_profile);
  const logoutUser = useAppStore(state => state.logout);
  const showToast = useAppStore(state => state.show_toast);
  const savedPropertiesCount = useAppStore(state => state.user_favorites.saved_properties.length);

  // ========== LOCAL STATE ==========
  const [activeTab, setActiveTab] = useState<'profile' | 'saved' | 'inquiries' | 'settings'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState<ProfileEditForm>({
    full_name: '',
    phone_number: '',
    location: ''
  });
  const [profileValidationErrors, setProfileValidationErrors] = useState<Record<string, string>>({});
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const [passwordChangeForm, setPasswordChangeForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordValidationErrors, setPasswordValidationErrors] = useState<Record<string, string>>({});
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const [profilePhotoUpload, setProfilePhotoUpload] = useState({
    file: null as File | null,
    preview_url: null as string | null,
    uploading: false,
    upload_progress: 0,
    upload_error: null as string | null
  });

  const [deleteAccountModal, setDeleteAccountModal] = useState({
    is_open: false,
    password_confirmation: '',
    confirm_checkbox: false,
    is_submitting: false,
    error: null as string | null
  });

  // ========== REDIRECT IF NOT AUTHENTICATED ==========
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login?redirect=/account');
    }
  }, [isAuthenticated, currentUser, navigate]);

  // ========== REACT QUERY: LOAD USER PROFILE ==========
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ['user-profile', currentUser?.user_id],
    queryFn: async () => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${userAuthToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!userAuthToken && !!currentUser,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Initialize edit form when user profile loads
  useEffect(() => {
    if (userProfile && !isEditingProfile) {
      setProfileEditForm({
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        location: userProfile.location || ''
      });
    }
  }, [userProfile, isEditingProfile]);

  // ========== REACT QUERY: LOAD NOTIFICATION PREFERENCES ==========
  const { data: notificationPreferences, isLoading: isLoadingPreferences } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences', currentUser?.user_id],
    queryFn: async () => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/notification-preferences`,
        {
          headers: {
            'Authorization': `Bearer ${userAuthToken}`
          }
        }
      );
      return response.data;
    },
    enabled: !!userAuthToken && activeTab === 'settings',
    staleTime: 300000
  });

  // ========== MUTATION: UPDATE USER PROFILE ==========
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileEditForm) => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        profileData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: (updatedUser: UserProfile) => {
      queryClient.setQueryData(['user-profile', currentUser?.user_id], updatedUser);
      updateUserProfileGlobal(updatedUser);
      setIsEditingProfile(false);
      setProfileSaveSuccess(true);
      showToast('Profile updated successfully', 'success');
      
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update profile';
      showToast(errorMsg, 'error');
      
      if (error.response?.data?.error?.details) {
        setProfileValidationErrors(error.response.data.error.details);
      }
    }
  });

  // ========== MUTATION: CHANGE PASSWORD ==========
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { current_password: string; new_password: string }) => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/change-password`,
        passwordData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setPasswordChangeForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setPasswordChangeSuccess(true);
      showToast('Password changed successfully', 'success');
      
      setTimeout(() => setPasswordChangeSuccess(false), 3000);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to change password';
      showToast(errorMsg, 'error');
      
      if (error.response?.data?.error?.code === 'INVALID_PASSWORD') {
        setPasswordValidationErrors({ current_password: 'Current password is incorrect' });
      }
    }
  });

  // ========== MUTATION: UPDATE NOTIFICATION PREFERENCES ==========
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/notification-preferences`,
        preferences,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userAuthToken}`
          }
        }
      );
      return response.data;
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['notification-preferences', currentUser?.user_id], updatedPreferences);
      showToast('Notification preferences updated', 'success');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update preferences';
      showToast(errorMsg, 'error');
    }
  });

  // ========== MUTATION: DELETE ACCOUNT ==========
  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!userAuthToken) throw new Error('Not authenticated');
      
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${userAuthToken}`
          },
          data: {
            password: password
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setDeleteAccountModal({ ...deleteAccountModal, is_open: false });
      showToast('Account deleted successfully. We\'re sorry to see you go.', 'info', 5000);
      
      setTimeout(() => {
        logoutUser();
        navigate('/');
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete account';
      setDeleteAccountModal(prev => ({
        ...prev,
        is_submitting: false,
        error: errorMsg
      }));
    }
  });

  // ========== HANDLERS ==========
  
  const handleEditProfileClick = () => {
    setIsEditingProfile(true);
    setProfileValidationErrors({});
    setProfileSaveSuccess(false);
  };

  const handleCancelEditProfile = () => {
    if (userProfile) {
      setProfileEditForm({
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        location: userProfile.location || ''
      });
    }
    setIsEditingProfile(false);
    setProfileValidationErrors({});
  };

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!profileEditForm.full_name.trim()) {
      errors.full_name = 'Name is required';
    }
    
    if (profileEditForm.phone_number && !/^\d{3}-\d{3}-\d{4}$/.test(profileEditForm.phone_number.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'))) {
      // Allow empty or valid format
      if (profileEditForm.phone_number.trim()) {
        errors.phone_number = 'Invalid phone format';
      }
    }
    
    setProfileValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = () => {
    if (!validateProfileForm()) return;
    
    updateProfileMutation.mutate(profileEditForm);
  };

  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeForm, value: string) => {
    setPasswordChangeForm(prev => ({ ...prev, [field]: value }));
    setPasswordValidationErrors({});
    setPasswordChangeSuccess(false);
    
    if (field === 'new_password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!passwordChangeForm.current_password) {
      errors.current_password = 'Current password is required';
    }
    
    if (!passwordChangeForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordChangeForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }
    
    if (passwordChangeForm.new_password !== passwordChangeForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setPasswordValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    changePasswordMutation.mutate({
      current_password: passwordChangeForm.current_password,
      new_password: passwordChangeForm.new_password
    });
  };

  const handlePreferenceToggle = (preference: keyof Omit<NotificationPreferences, 'preference_id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!notificationPreferences) return;
    
    const updatedValue = !notificationPreferences[preference];
    
    // Optimistically update UI
    queryClient.setQueryData(['notification-preferences', currentUser?.user_id], {
      ...notificationPreferences,
      [preference]: updatedValue
    });
    
    updatePreferencesMutation.mutate({
      preference_id: notificationPreferences.preference_id,
      [preference]: updatedValue
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoUpload(prev => ({
        ...prev,
        upload_error: 'Image must be less than 5MB'
      }));
      return;
    }
    
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setProfilePhotoUpload(prev => ({
        ...prev,
        upload_error: 'Image must be JPG or PNG'
      }));
      return;
    }
    
    // Create preview
    const preview_url = URL.createObjectURL(file);
    
    setProfilePhotoUpload({
      file,
      preview_url,
      uploading: false,
      upload_progress: 0,
      upload_error: null
    });
  };

  const handleOpenDeleteModal = () => {
    setDeleteAccountModal({
      is_open: true,
      password_confirmation: '',
      confirm_checkbox: false,
      is_submitting: false,
      error: null
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteAccountModal.password_confirmation) {
      setDeleteAccountModal(prev => ({
        ...prev,
        error: 'Please enter your password to confirm'
      }));
      return;
    }
    
    if (!deleteAccountModal.confirm_checkbox) {
      setDeleteAccountModal(prev => ({
        ...prev,
        error: 'Please check the confirmation box'
      }));
      return;
    }
    
    setDeleteAccountModal(prev => ({ ...prev, is_submitting: true, error: null }));
    deleteAccountMutation.mutate(deleteAccountModal.password_confirmation);
  };

  // ========== RENDER ==========
  
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">My Account</h1>
            <p className="text-gray-600 mt-2">Manage your profile, settings, and preferences</p>
          </div>

          {/* Account Overview Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {userProfile?.profile_photo_url || profilePhotoUpload.preview_url ? (
                  <img
                    src={profilePhotoUpload.preview_url || userProfile?.profile_photo_url || ''}
                    alt={userProfile?.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-blue-100">
                    {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{userProfile?.full_name}</h2>
                <p className="text-gray-600">{userProfile?.email}</p>
                {!userProfile?.email_verified && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Email not verified
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Member since</p>
                <p className="text-gray-900 font-semibold">
                  {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === 'profile'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="w-5 h-5 inline-block mr-2" />
                  Profile
                </button>
                
                <Link
                  to="/saved-properties"
                  className="flex-1 py-4 px-6 text-center border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-all duration-200"
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Saved ({savedPropertiesCount})
                </Link>
                
                <Link
                  to="/my-inquiries"
                  className="flex-1 py-4 px-6 text-center border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-all duration-200"
                >
                  <Mail className="w-5 h-5 inline-block mr-2" />
                  My Inquiries
                </Link>
                
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                    {!isEditingProfile && (
                      <button
                        onClick={handleEditProfileClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isLoadingProfile ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Profile Photo Section */}
                      <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700">Profile Photo</label>
                        <div className="flex items-center space-x-6">
                          {userProfile?.profile_photo_url || profilePhotoUpload.preview_url ? (
                            <img
                              src={profilePhotoUpload.preview_url || userProfile?.profile_photo_url || ''}
                              alt="Profile"
                              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200">
                              {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          
                          {isEditingProfile && (
                            <div>
                              <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-200 border border-gray-300">
                                <Camera className="w-5 h-5 mr-2" />
                                Change Photo
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={handlePhotoSelect}
                                  className="hidden"
                                />
                              </label>
                              <p className="text-xs text-gray-500 mt-2">JPG or PNG, max 5MB</p>
                              {profilePhotoUpload.upload_error && (
                                <p className="text-xs text-red-600 mt-1">{profilePhotoUpload.upload_error}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Profile Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Full Name */}
                        <div>
                          <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                            Full Name *
                          </label>
                          {isEditingProfile ? (
                            <>
                              <input
                                type="text"
                                id="full_name"
                                value={profileEditForm.full_name}
                                onChange={(e) => {
                                  setProfileEditForm(prev => ({ ...prev, full_name: e.target.value }));
                                  setProfileValidationErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.full_name;
                                    return newErrors;
                                  });
                                }}
                                className={`w-full px-4 py-3 rounded-lg border-2 ${
                                  profileValidationErrors.full_name
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                                } focus:ring-4 transition-all duration-200`}
                                placeholder="Enter your full name"
                              />
                              {profileValidationErrors.full_name && (
                                <p className="text-red-600 text-sm mt-1">{profileValidationErrors.full_name}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-900 py-3 px-4 bg-gray-50 rounded-lg">{userProfile?.full_name || 'Not set'}</p>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            Email Address *
                            {userProfile?.email_verified && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Verified
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              id="email"
                              value={userProfile?.email || ''}
                              disabled
                              className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone Number
                          </label>
                          {isEditingProfile ? (
                            <>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                  type="tel"
                                  id="phone_number"
                                  value={profileEditForm.phone_number}
                                  onChange={(e) => {
                                    setProfileEditForm(prev => ({ ...prev, phone_number: e.target.value }));
                                    setProfileValidationErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.phone_number;
                                      return newErrors;
                                    });
                                  }}
                                  className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 ${
                                    profileValidationErrors.phone_number
                                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                                  } focus:ring-4 transition-all duration-200`}
                                  placeholder="(123) 456-7890"
                                />
                              </div>
                              {profileValidationErrors.phone_number && (
                                <p className="text-red-600 text-sm mt-1">{profileValidationErrors.phone_number}</p>
                              )}
                            </>
                          ) : (
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <p className="text-gray-900 py-3 pl-10 pr-4 bg-gray-50 rounded-lg">
                                {userProfile?.phone_number || 'Not set'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        <div>
                          <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                            Location
                          </label>
                          {isEditingProfile ? (
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="text"
                                id="location"
                                value={profileEditForm.location}
                                onChange={(e) => setProfileEditForm(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                                placeholder="City, State"
                              />
                            </div>
                          ) : (
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <p className="text-gray-900 py-3 pl-10 pr-4 bg-gray-50 rounded-lg">
                                {userProfile?.location || 'Not set'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit Mode Action Buttons */}
                      {isEditingProfile && (
                        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                          <button
                            onClick={handleCancelEditProfile}
                            disabled={updateProfileMutation.isPending}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-200 border border-gray-300 disabled:opacity-50"
                          >
                            <X className="w-5 h-5 inline-block mr-2" />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={updateProfileMutation.isPending}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-5 h-5 inline-block mr-2" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Success Message */}
                      {profileSaveSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                          <Check className="w-5 h-5 mr-2" />
                          Profile updated successfully!
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="space-y-8">
                  {/* Change Password Section */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Lock className="w-6 h-6 mr-2 text-blue-600" />
                      Change Password
                    </h3>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {/* Current Password */}
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          Current Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            id="current_password"
                            value={passwordChangeForm.current_password}
                            onChange={(e) => handlePasswordInputChange('current_password', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                              passwordValidationErrors.current_password
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                            } focus:ring-4 transition-all duration-200`}
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {passwordValidationErrors.current_password && (
                          <p className="text-red-600 text-sm mt-1">{passwordValidationErrors.current_password}</p>
                        )}
                      </div>

                      {/* New Password */}
                      <div>
                        <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            id="new_password"
                            value={passwordChangeForm.new_password}
                            onChange={(e) => handlePasswordInputChange('new_password', e.target.value)}
                            className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${
                              passwordValidationErrors.new_password
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                            } focus:ring-4 transition-all duration-200`}
                            placeholder="Enter new password (min 8 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Strength Indicator */}
                        {passwordChangeForm.new_password && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                                    passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                                    'w-full bg-green-500'
                                  }`}
                                ></div>
                              </div>
                              <span className={`text-xs font-medium ${
                                passwordStrength === 'weak' ? 'text-red-600' :
                                passwordStrength === 'medium' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {passwordValidationErrors.new_password && (
                          <p className="text-red-600 text-sm mt-1">{passwordValidationErrors.new_password}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          id="confirm_password"
                          value={passwordChangeForm.confirm_password}
                          onChange={(e) => handlePasswordInputChange('confirm_password', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            passwordValidationErrors.confirm_password
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200`}
                          placeholder="Confirm new password"
                        />
                        {passwordValidationErrors.confirm_password && (
                          <p className="text-red-600 text-sm mt-1">{passwordValidationErrors.confirm_password}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
                            Updating Password...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>

                      {passwordChangeSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                          <Check className="w-5 h-5 mr-2" />
                          Password updated successfully!
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Email Preferences Section */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Bell className="w-6 h-6 mr-2 text-blue-600" />
                      Email Notifications
                    </h3>
                    
                    {isLoadingPreferences ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : notificationPreferences ? (
                      <div className="space-y-4">
                        {/* Price Change Notifications */}
                        <label className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Price Changes on Saved Properties</p>
                            <p className="text-sm text-gray-600">Get notified when prices drop on properties you've saved</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.saved_property_price_change}
                            onChange={() => handlePreferenceToggle('saved_property_price_change')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>

                        {/* Status Change Notifications */}
                        <label className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Status Updates on Saved Properties</p>
                            <p className="text-sm text-gray-600">Get notified when saved properties are sold, rented, or go pending</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.saved_property_status_change}
                            onChange={() => handlePreferenceToggle('saved_property_status_change')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>

                        {/* New Matching Properties */}
                        <label className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">New Matching Properties</p>
                            <p className="text-sm text-gray-600">Receive alerts for new listings matching your saved searches</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.new_matching_properties}
                            onChange={() => handlePreferenceToggle('new_matching_properties')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>

                        {/* Agent Reply */}
                        <label className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Agent Responses</p>
                            <p className="text-sm text-gray-600">Get notified when agents reply to your inquiries</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.agent_reply_received}
                            onChange={() => handlePreferenceToggle('agent_reply_received')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>

                        {/* Platform Updates */}
                        <label className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Platform Updates & News</p>
                            <p className="text-sm text-gray-600">Receive updates about PropConnect features and tips</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.platform_updates}
                            onChange={() => handlePreferenceToggle('platform_updates')}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    ) : (
                      <p className="text-gray-500">Unable to load notification preferences</p>
                    )}
                  </div>

                  {/* Delete Account Section */}
                  <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                    <h3 className="text-xl font-bold text-red-900 mb-2 flex items-center">
                      <Trash2 className="w-6 h-6 mr-2" />
                      Delete Account
                    </h3>
                    <p className="text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleOpenDeleteModal}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 border-2 border-red-700"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {deleteAccountModal.is_open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-red-900 flex items-center">
                  <AlertCircle className="w-7 h-7 mr-2 text-red-600" />
                  Delete Account?
                </h3>
                <button
                  onClick={() => setDeleteAccountModal(prev => ({ ...prev, is_open: false }))}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={deleteAccountModal.is_submitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Warning: This action is permanent!</p>
                <p className="text-red-700 text-sm">
                  Deleting your account will permanently remove:
                </p>
                <ul className="text-red-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Your profile and personal information</li>
                  <li>All saved properties ({savedPropertiesCount} properties)</li>
                  <li>Your inquiry history</li>
                  <li>Email preferences and settings</li>
                </ul>
              </div>

              {/* Password Confirmation */}
              <div className="mb-4">
                <label htmlFor="delete_password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter your password to confirm *
                </label>
                <input
                  type="password"
                  id="delete_password"
                  value={deleteAccountModal.password_confirmation}
                  onChange={(e) => setDeleteAccountModal(prev => ({ ...prev, password_confirmation: e.target.value, error: null }))}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200"
                  placeholder="Enter your password"
                  disabled={deleteAccountModal.is_submitting}
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAccountModal.confirm_checkbox}
                  onChange={(e) => setDeleteAccountModal(prev => ({ ...prev, confirm_checkbox: e.target.checked, error: null }))}
                  className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500 mt-0.5 cursor-pointer"
                  disabled={deleteAccountModal.is_submitting}
                />
                <span className="ml-3 text-sm text-gray-700">
                  I understand this is permanent and cannot be undone
                </span>
              </label>

              {/* Error Message */}
              {deleteAccountModal.error && (
                <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {deleteAccountModal.error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDeleteAccountModal(prev => ({ ...prev, is_open: false }))}
                  disabled={deleteAccountModal.is_submitting}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-all duration-200 border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteAccountModal.is_submitting}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteAccountModal.is_submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_UserAccount;