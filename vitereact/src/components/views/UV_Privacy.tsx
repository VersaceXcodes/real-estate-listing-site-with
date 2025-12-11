import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { FileText, Mail, Shield, Eye, Lock, Cookie, Database, UserX, Download, CheckCircle, AlertCircle } from 'lucide-react';

const UV_Privacy: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors - no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userAuthToken = useAppStore(state => state.authentication_state.user_auth_token);
  const logout = useAppStore(state => state.logout);
  const showToast = useAppStore(state => state.show_toast);
  const openModal = useAppStore(state => state.open_modal);
  const closeModal = useAppStore(state => state.close_modal);
  const activeModal = useAppStore(state => state.ui_state.active_modal);
  
  // Local state
  const [activeSection, setActiveSection] = useState<string>('');
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionConfirm, setDeletionConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  
  // Static privacy policy content
  const privacyContent = {
    title: 'Privacy Policy',
    effectiveDate: 'January 1, 2024',
    lastUpdated: 'January 1, 2024',
    contactEmail: 'privacy@propconnect.com',
    
    sections: [
      {
        id: 'introduction',
        title: '1. Introduction',
        icon: Shield,
        content: `Welcome to PropConnect. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our real estate listing platform. By accessing or using PropConnect, you agree to this Privacy Policy. If you do not agree, please discontinue use of our services.

We are committed to protecting your privacy and ensuring you understand how your data is handled. This policy applies to all users including property seekers, real estate agents, and administrators.`
      },
      {
        id: 'information-we-collect',
        title: '2. Information We Collect',
        icon: Database,
        content: `**2.1 Information You Provide Directly**

When you create an account, we collect:
• Full name and email address
• Phone number (optional for property seekers, required for agents)
• Password (securely hashed)
• Profile photo (optional)
• Location/city (optional)
• Real estate license information (agents only)
• Agency details and professional credentials (agents only)

When you use our services, we collect:
• Property search queries and filters
• Saved property favorites
• Inquiry messages sent to agents  
• Property viewing preferences
• Notification and communication preferences
• Property listings and descriptions (agents only)
• Photos and virtual tour links uploaded to listings

**2.2 Information Collected Automatically**

When you access our platform, we automatically collect:
• IP address and device information
• Browser type and version
• Operating system
• Pages visited and time spent on pages
• Referring website addresses
• Property views and interactions
• Search patterns and behavior
• Cookies and similar tracking technologies

**2.3 Information from Third Parties**

We may receive information from:
• Social media platforms (if you connect your accounts)
• Public databases for address verification (Google Places API)
• MLS (Multiple Listing Service) data for property information
• Credit reporting agencies (for agent verification only)
• Background check services (agent license verification)`
      },
      {
        id: 'how-we-use-information',
        title: '3. How We Use Your Information',
        icon: Eye,
        content: `We use your personal information for the following purposes:

**3.1 Service Delivery**
• Creating and managing your account
• Authenticating your identity
• Processing property searches and displaying results
• Facilitating communication between property seekers and agents
• Sending inquiry notifications to real estate agents
• Managing property listings and photo galleries
• Tracking property views for analytics

**3.2 Communication**
• Sending email notifications about inquiries and replies
• Alerting you to saved property price changes or status updates
• Providing platform updates and new features
• Responding to your questions and support requests
• Sending verification emails for account security

**3.3 Platform Improvement**
• Analyzing usage patterns to improve search functionality
• Monitoring platform performance and identifying technical issues
• Conducting research to enhance user experience
• Developing new features based on user behavior
• Generating aggregate statistics (never personally identifiable)

**3.4 Security and Fraud Prevention**
• Detecting and preventing fraudulent listings
• Verifying agent licenses and credentials
• Monitoring for suspicious activity or policy violations
• Protecting against spam and abuse
• Maintaining platform integrity and safety

**3.5 Legal Compliance**
• Complying with applicable laws and regulations
• Responding to legal requests and preventing harm
• Enforcing our Terms of Service
• Protecting our rights and property`
      },
      {
        id: 'data-sharing',
        title: '4. How We Share Your Information',
        icon: Lock,
        content: `We share your information only in the following limited circumstances:

**4.1 Between Users and Agents**
When you submit an inquiry about a property, we share:
• Your name and contact information with the listing agent
• Your inquiry message and viewing preferences
• Your user ID and account status (if registered)

**4.2 Service Providers**
We share data with trusted third-party service providers:
• Cloud hosting providers (AWS, DigitalOcean) for data storage
• Email service providers (SendGrid, Mailgun) for notifications
• Analytics providers (Google Analytics) for usage insights
• Payment processors (Stripe) for transaction handling
• Map services (Google Maps) for location features
• Image hosting services (S3, Cloudinary) for photo storage

All service providers are contractually obligated to protect your data and use it only for specified purposes.

**4.3 Legal Requirements**
We may disclose your information:
• To comply with court orders, subpoenas, or legal processes
• To protect our rights, property, or safety
• To prevent fraud or security threats
• To enforce our Terms of Service
• When required by law enforcement or regulatory authorities

**4.4 Business Transfers**
If PropConnect is acquired or merged with another company, your information may be transferred to the new entity. You will be notified of any such change.

**4.5 With Your Consent**
We may share your information for other purposes with your explicit consent.

**We NEVER:**
• Sell your personal information to third parties
• Share your data with advertisers without consent
• Disclose your saved searches or property favorites publicly`
      },
      {
        id: 'cookies-tracking',
        title: '5. Cookies and Tracking Technologies',
        icon: Cookie,
        content: `**5.1 Types of Cookies We Use**

**Essential Cookies**
Required for platform functionality:
• Authentication cookies (session management)
• Security cookies (CSRF protection)
• Load balancing cookies (performance)

**Functional Cookies**
Enhance your experience:
• Language preferences
• Display settings (grid/list view)
• Search filter preferences
• Location memory for search

**Analytics Cookies**
Help us understand usage:
• Google Analytics (anonymized IP)
• Page view tracking
• Feature usage statistics
• Error logging and diagnostics

**Advertising Cookies** (Optional)
Used only with your consent:
• Behavioral targeting (opt-in only)
• Retargeting campaigns (opt-in only)

**5.2 Managing Cookies**

You can control cookies through:
• Browser settings (block all cookies)
• Our cookie consent banner (customize preferences)
• Opt-out tools provided by analytics services

Note: Disabling essential cookies may impact platform functionality.

**5.3 Do Not Track**
We honor Do Not Track (DNT) browser signals and will not track users who enable this setting.`
      },
      {
        id: 'data-retention',
        title: '6. Data Retention and Storage',
        icon: Database,
        content: `**6.1 How Long We Keep Your Data**

We retain personal information only as long as necessary:

**Active Accounts**
• Account data: Until you close your account
• Property listings: While active + 1 year after marked sold/rented
• Inquiry messages: 3 years for customer service purposes
• Search history: 2 years for analytics
• Session data: 30 days or until logout

**Closed Accounts**
• Account data: Deleted within 30 days of closure
• Anonymized analytics: Retained indefinitely
• Legal records: As required by law (typically 7 years)
• Backup data: Deleted within 90 days

**Agent Accounts**
• Professional credentials: Retained for compliance (as long as required by law)
• Transaction records: 7 years for legal purposes
• Listing history: Archived but not publicly visible

**6.2 Data Storage and Security**

Your data is stored:
• In secure, encrypted databases (PostgreSQL with TLS)
• On cloud servers in the United States (AWS US-East region)
• With regular backups for disaster recovery
• Behind firewalls and access controls
• With encryption in transit (HTTPS/TLS 1.3)
• With encryption at rest (AES-256)

We implement industry-standard security measures including:
• Multi-factor authentication for sensitive operations
• Regular security audits and penetration testing
• Employee access controls and training
• Intrusion detection and prevention systems
• Incident response procedures`
      },
      {
        id: 'your-rights',
        title: '7. Your Privacy Rights',
        icon: CheckCircle,
        content: `**7.1 General Rights**

You have the right to:

✓ **Access** - Request a copy of all personal data we hold about you
✓ **Rectification** - Correct inaccurate or incomplete information  
✓ **Erasure** - Request deletion of your personal data (see section 7.3)
✓ **Portability** - Receive your data in a machine-readable format
✓ **Restriction** - Limit how we process your data
✓ **Objection** - Object to certain processing activities
✓ **Withdraw Consent** - Revoke permission for data processing

**7.2 GDPR Rights (EU Residents)**

If you are located in the European Union, you have additional rights under GDPR:
• Right to lodge complaints with supervisory authorities
• Right to know the legal basis for data processing
• Right to know data retention periods
• Right to data portability across services
• Enhanced consent requirements before processing

**7.3 Data Deletion Process**

To delete your account and data:

1. Log in to your PropConnect account
2. Navigate to Account Settings
3. Click "Delete My Account"
4. Confirm your password
5. Select reason for deletion (optional)
6. Receive confirmation email

We will delete within 30 days:
• Your account credentials and profile
• Saved properties and search history
• Personal notification preferences
• Uploaded photos and documents

We will retain (anonymized or as required by law):
• Transaction records (7 years)
• Aggregated analytics (no personal identifiers)
• Legal compliance records

**7.4 California Privacy Rights (CCPA)**

California residents have additional rights:
• Right to know what personal information is collected
• Right to know if information is sold or disclosed
• Right to opt-out of sale of personal information (we don't sell data)
• Right to non-discrimination for exercising privacy rights

**7.5 Exercising Your Rights**

To exercise any of these rights:
• Email us at ${privacyContent.contactEmail}
• Use the account deletion tool in your settings
• Submit a written request to our office address
• Contact our Data Protection Officer

We will respond within 30 days (or as required by applicable law).`
      },
      {
        id: 'childrens-privacy',
        title: '8. Children\'s Privacy',
        icon: AlertCircle,
        content: `PropConnect is not intended for use by children under the age of 18. We do not knowingly collect personal information from children.

If you are under 18 years old, please do not:
• Create an account
• Submit inquiries
• Provide any personal information

If we learn we have collected information from a child under 18, we will delete it immediately. If you believe a child has provided us with personal information, please contact us at ${privacyContent.contactEmail}.

Parents and guardians: Please monitor your children's internet usage and help us protect their privacy.`
      },
      {
        id: 'changes-to-policy',
        title: '9. Changes to This Privacy Policy',
        icon: FileText,
        content: `We may update this Privacy Policy periodically to reflect:
• Changes in our data practices
• New features or services
• Legal or regulatory requirements
• User feedback and best practices

**When We Make Changes:**
• We will update the "Last Updated" date at the top
• Material changes will be notified via email to registered users
• Continued use after changes constitutes acceptance
• You can review the previous version upon request

**Notification Methods:**
• Email notification to your registered email address
• Banner notification when you log in
• Announcement on our homepage
• Version history available upon request

We encourage you to review this Privacy Policy regularly to stay informed about how we protect your information.`
      },
      {
        id: 'international-transfers',
        title: '10. International Data Transfers',
        icon: Shield,
        content: `PropConnect is based in the United States and processes data on US servers.

**If you are accessing from outside the US:**
• Your information will be transferred to and processed in the United States
• US privacy laws may differ from those in your country
• We implement safeguards to protect your data during transfer
• We comply with applicable data protection frameworks

**Data Transfer Safeguards:**
• Standard Contractual Clauses (SCCs) for EU transfers
• Encryption during transit and at rest
• Access controls and security measures
• Regular compliance audits

**Your Consent:**
By using PropConnect from outside the United States, you consent to the transfer and processing of your information in the US.`
      },
      {
        id: 'contact-us',
        title: '11. Contact Us',
        icon: Mail,
        content: `If you have questions, concerns, or requests regarding this Privacy Policy or your personal data:

**Email:** ${privacyContent.contactEmail}

**Mail:**
PropConnect Privacy Team
[Office Address]
[City, State ZIP]

**Data Protection Officer:**
For GDPR-related inquiries, contact our DPO at dpo@propconnect.com

**Response Time:**
We aim to respond to all privacy inquiries within 30 days. For urgent matters, please mark your email as "URGENT."

**What to Include:**
• Your full name and registered email
• Description of your inquiry or request
• Any relevant account information (if applicable)
• Preferred method of response`
      }
    ]
  };
  
  // Handle delete account action
  const handleDeleteAccountClick = () => {
    openModal('delete_account_confirmation');
    setDeletionPassword('');
    setDeletionConfirm(false);
    setDeletionError(null);
  };
  
  const handleConfirmDeleteAccount = async () => {
    if (!deletionPassword) {
      setDeletionError('Please enter your password to confirm');
      return;
    }
    
    if (!deletionConfirm) {
      setDeletionError('Please confirm you understand this action is permanent');
      return;
    }
    
    setIsDeletingAccount(true);
    setDeletionError(null);
    
    try {
      // API call to delete account
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${userAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: deletionPassword,
            confirm_deletion: deletionConfirm
          })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete account');
      }
      
      // Success - logout and redirect
      closeModal();
      showToast('Your account has been deleted. We\'re sorry to see you go.', 'success', 5000);
      
      // Wait a moment before logout to show toast
      setTimeout(() => {
        logout();
        navigate('/');
      }, 1500);
      
    } catch (error: any) {
      setDeletionError(error.message || 'Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };
  
  const handleCancelDeletion = () => {
    closeModal();
    setDeletionPassword('');
    setDeletionConfirm(false);
    setDeletionError(null);
  };
  
  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(sectionId);
    }
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {privacyContent.title}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Your privacy is important to us
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Effective: {privacyContent.effectiveDate}
              </span>
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Last Updated: {privacyContent.lastUpdated}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Table of Contents
                  </h3>
                  <nav className="space-y-2">
                    {privacyContent.sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center space-x-2 ${
                            activeSection === section.id
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-2">{section.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
                
                {/* Quick Actions */}
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">
                    Quick Actions
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Print Policy</span>
                    </button>
                    <Link
                      to="/terms"
                      className="w-full flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span>View Terms of Service</span>
                    </Link>
                    <a
                      href={`mailto:${privacyContent.contactEmail}`}
                      className="w-full flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Contact Privacy Team</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Policy Content */}
            <div className="lg:col-span-3 space-y-12">
              {/* Policy Sections */}
              {privacyContent.sections.map((section) => {
                const Icon = section.icon;
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 pt-1">
                        {section.title}
                      </h2>
                    </div>
                    <div className="ml-13 prose prose-gray max-w-none">
                      {section.content.split('\n\n').map((paragraph, idx) => {
                        // Handle bold headers
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return (
                            <h3 key={idx} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
                              {paragraph.replace(/\*\*/g, '')}
                            </h3>
                          );
                        }
                        
                        // Handle bullet lists
                        if (paragraph.startsWith('•')) {
                          const items = paragraph.split('\n');
                          return (
                            <ul key={idx} className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                              {items.map((item, itemIdx) => (
                                <li key={itemIdx} className="leading-relaxed">
                                  {item.replace('• ', '')}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        
                        // Handle check mark lists
                        if (paragraph.startsWith('✓')) {
                          const items = paragraph.split('\n');
                          return (
                            <ul key={idx} className="space-y-3 mb-4">
                              {items.map((item, itemIdx) => {
                                const [title, ...desc] = item.replace('✓ ', '').split(' - ');
                                return (
                                  <li key={itemIdx} className="flex items-start space-x-2">
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold text-gray-900">{title}</span>
                                      {desc.length > 0 && (
                                        <span className="text-gray-700"> - {desc.join(' - ')}</span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        }
                        
                        // Regular paragraph
                        return (
                          <p key={idx} className="text-gray-700 leading-relaxed mb-4">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              
              {/* Authenticated User - Data Deletion Section */}
              {isAuthenticated && currentUser && (
                <section className="scroll-mt-24 border-t-2 border-gray-200 pt-12">
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-8">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <UserX className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          Account Data Management
                        </h2>
                        <p className="text-gray-700 mb-6 leading-relaxed">
                          You are currently logged in as <strong>{currentUser.full_name}</strong> ({currentUser.email}). 
                          You can request deletion of your account and all associated personal data at any time.
                        </p>
                        
                        <div className="bg-white rounded-lg border border-red-200 p-6 mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            What will be deleted:
                          </h3>
                          <ul className="space-y-2 text-gray-700 mb-4">
                            <li className="flex items-start space-x-2">
                              <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>Your account credentials and profile information</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>Saved/favorited properties</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>Search history and preferences</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>Email notification preferences</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>Profile photos and uploaded documents</span>
                            </li>
                          </ul>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
                            What will be retained:
                          </h3>
                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start space-x-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <span>Anonymized inquiry messages (your name/email removed, but content preserved for agent records)</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <span>Aggregated analytics data (no personal identifiers)</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <span>Legal compliance records (as required by law)</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Warning:</strong> This action cannot be undone
                            </p>
                            <p className="text-sm text-gray-600">
                              Data deletion typically completes within 30 days
                            </p>
                          </div>
                          <button
                            onClick={handleDeleteAccountClick}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-100"
                          >
                            Delete My Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              
              {/* Contact Section */}
              <section className="border-t-2 border-gray-200 pt-12">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Questions About Your Privacy?
                      </h2>
                      <p className="text-gray-700 mb-4 leading-relaxed">
                        If you have any questions about this Privacy Policy or how we handle your data, 
                        we're here to help. Our privacy team is dedicated to ensuring transparency and protecting your rights.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <a
                          href={`mailto:${privacyContent.contactEmail}`}
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <Mail className="h-5 w-5 mr-2" />
                          Email Privacy Team
                        </a>
                        <Link
                          to="/terms"
                          className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-medium border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200"
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          View Terms of Service
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      {activeModal === 'delete_account_confirmation' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCancelDeletion}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Delete Your Account?
                </h3>
                <p className="text-gray-600">
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              
              {deletionError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{deletionError}</p>
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="deletion-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm your password
                  </label>
                  <input
                    id="deletion-password"
                    type="password"
                    value={deletionPassword}
                    onChange={(e) => {
                      setDeletionPassword(e.target.value);
                      setDeletionError(null);
                    }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all outline-none"
                    disabled={isDeletingAccount}
                  />
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    id="deletion-confirm"
                    type="checkbox"
                    checked={deletionConfirm}
                    onChange={(e) => {
                      setDeletionConfirm(e.target.checked);
                      setDeletionError(null);
                    }}
                    className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    disabled={isDeletingAccount}
                  />
                  <label htmlFor="deletion-confirm" className="text-sm text-gray-700">
                    I understand this action is permanent and cannot be undone. All my saved properties, search history, and account data will be permanently deleted.
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelDeletion}
                  disabled={isDeletingAccount}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAccount}
                  disabled={isDeletingAccount || !deletionPassword || !deletionConfirm}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-100"
                >
                  {isDeletingAccount ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-100"
        aria-label="Scroll to top"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </>
  );
};

export default UV_Privacy;