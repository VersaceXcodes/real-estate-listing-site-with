import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface TermsSection {
  id: string;
  title: string;
  content: string;
}

const UV_Terms: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);

  // Static terms sections content
  const termsSections: TermsSection[] = [
    {
      id: 'introduction',
      title: 'Introduction',
      content: `
        <p>Welcome to PropConnect ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the PropConnect platform, website, and services.</p>
        <p class="mt-4">By accessing or using PropConnect, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the platform.</p>
        <p class="mt-4"><strong>Last Updated:</strong> January 25, 2024</p>
      `
    },
    {
      id: 'definitions',
      title: 'Definitions',
      content: `
        <p>For purposes of these Terms:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li><strong>"Platform"</strong> means the PropConnect website, mobile applications, and all related services.</li>
          <li><strong>"Property Seeker"</strong> or "User" means individuals searching for properties to buy or rent.</li>
          <li><strong>"Agent"</strong> means licensed real estate professionals who list properties on the Platform.</li>
          <li><strong>"Listing"</strong> means a property advertisement posted by an Agent.</li>
          <li><strong>"Inquiry"</strong> means a message sent by a Property Seeker to an Agent regarding a Listing.</li>
          <li><strong>"Content"</strong> means all text, images, data, and materials displayed on the Platform.</li>
        </ul>
      `
    },
    {
      id: 'property-seekers',
      title: 'Terms for Property Seekers',
      content: `
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Account Registration</h3>
        <p>You may browse properties without an account, but certain features require registration:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Saving favorite properties</li>
          <li>Submitting inquiries to agents</li>
          <li>Tracking inquiry responses</li>
          <li>Creating saved searches with alerts</li>
        </ul>
        <p class="mt-4">When registering, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Use of Platform</h3>
        <p>As a Property Seeker, you agree to:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Provide accurate information when contacting agents</li>
          <li>Use the inquiry system for legitimate property-related questions only</li>
          <li>Not misuse or abuse the platform for spam or malicious purposes</li>
          <li>Respect intellectual property rights of all content displayed</li>
          <li>Not scrape, copy, or redistribute property data without permission</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">3. No Warranty on Listings</h3>
        <p>PropConnect is a platform connecting Property Seekers with Agents. We do not:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Verify the accuracy of property information</li>
          <li>Guarantee the availability of listed properties</li>
          <li>Endorse or recommend any specific agent or property</li>
          <li>Participate in property transactions or negotiations</li>
        </ul>
        <p class="mt-4">All property information is provided by Agents. You should independently verify all details before making any decisions.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Email Communications</h3>
        <p>By creating an account, you consent to receive:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Transactional emails (inquiry confirmations, agent responses)</li>
          <li>Notifications about saved properties (price changes, status updates)</li>
          <li>Platform updates and important announcements</li>
        </ul>
        <p class="mt-4">You may opt out of non-essential communications in your account settings.</p>
      `
    },
    {
      id: 'agent-terms',
      title: 'Terms for Real Estate Agents',
      content: `
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Agent Registration and Approval</h3>
        <p>To list properties on PropConnect, you must:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Hold a valid real estate license in good standing</li>
          <li>Provide accurate license information and documentation</li>
          <li>Submit to verification by platform administrators</li>
          <li>Maintain active licensure throughout platform use</li>
        </ul>
        <p class="mt-4">We reserve the right to reject any agent application or suspend accounts at our discretion.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Listing Standards</h3>
        <p>All property listings must:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Contain accurate and truthful information</li>
          <li>Include clear, high-quality photos of the actual property</li>
          <li>Comply with Fair Housing laws and regulations</li>
          <li>Not contain discriminatory language or preferences</li>
          <li>Be updated promptly when property status changes</li>
          <li>Be removed within 24 hours of sale, rent, or withdrawal from market</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Subscription and Fees</h3>
        <p>PropConnect offers the following pricing structure:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li><strong>Free Tier:</strong> Limited listings (up to 5 active listings)</li>
          <li><strong>Professional Tier:</strong> $49/month for unlimited listings, enhanced features, and priority placement</li>
          <li><strong>Premium Tier:</strong> $99/month includes all Professional features plus featured listings and advanced analytics</li>
        </ul>
        <p class="mt-4">Fees are billed monthly and are non-refundable. You may upgrade or downgrade your subscription at any time, with changes taking effect at the next billing cycle.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Commission Agreement</h3>
        <p>PropConnect charges NO commission or transaction fees. We operate on a subscription-based model only. You retain 100% of your commissions from property transactions.</p>
        <p class="mt-4">However, you acknowledge that:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>PropConnect is not a party to any transaction between you and property seekers</li>
          <li>All commission arrangements are between you and your clients</li>
          <li>You are solely responsible for your professional obligations and liabilities</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">5. Inquiry Response Requirements</h3>
        <p>As an Agent, you agree to:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Respond to legitimate inquiries within 24 hours</li>
          <li>Maintain professional and courteous communication</li>
          <li>Not spam or harass property seekers</li>
          <li>Keep contact information current and accurate</li>
        </ul>
        <p class="mt-4">Failure to respond to inquiries may result in reduced visibility or account suspension.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Intellectual Property Rights</h3>
        <p>You retain ownership of all photos and content you upload. By posting listings, you grant PropConnect a non-exclusive, worldwide license to:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Display your listings on the platform</li>
          <li>Share listings on social media for promotional purposes</li>
          <li>Create thumbnails and optimized versions of images</li>
          <li>Include listings in search results and featured sections</li>
        </ul>
        <p class="mt-4">This license terminates when you remove the listing, except for cached versions.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Account Termination</h3>
        <p>We may suspend or terminate your agent account if you:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Violate these Terms or applicable laws</li>
          <li>Post fraudulent or misleading listings</li>
          <li>Engage in prohibited conduct</li>
          <li>Fail to maintain a valid real estate license</li>
          <li>Receive excessive user complaints</li>
        </ul>
      `
    },
    {
      id: 'prohibited-conduct',
      title: 'Prohibited Conduct',
      content: `
        <p>All users (Property Seekers and Agents) are prohibited from:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Posting false, misleading, or fraudulent content</li>
          <li>Impersonating another person or entity</li>
          <li>Harassing, threatening, or abusing other users</li>
          <li>Violating any local, state, or federal laws</li>
          <li>Discriminating based on race, religion, gender, disability, familial status, or national origin</li>
          <li>Scraping or automated data collection</li>
          <li>Hacking, phishing, or distributing malware</li>
          <li>Interfering with platform security or functionality</li>
          <li>Using the platform for commercial purposes other than intended (e.g., selling data)</li>
        </ul>
        <p class="mt-4">Violation of these prohibitions may result in immediate account termination and legal action.</p>
      `
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      content: `
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Platform Content</h3>
        <p>The PropConnect platform, including its design, layout, logos, graphics, and software, is owned by PropConnect and protected by copyright, trademark, and other intellectual property laws.</p>
        <p class="mt-4">You may not:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Copy, modify, or distribute platform design elements</li>
          <li>Use PropConnect branding without written permission</li>
          <li>Reverse engineer or decompile platform software</li>
          <li>Create derivative works based on the platform</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">User-Generated Content</h3>
        <p>You retain ownership of content you submit (property listings, photos, messages). However, by posting content, you represent that:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>You own or have the right to use the content</li>
          <li>The content does not violate third-party rights</li>
          <li>The content does not contain illegal or harmful material</li>
        </ul>
        <p class="mt-4">We reserve the right to remove any content that violates these Terms or is otherwise objectionable.</p>
      `
    },
    {
      id: 'limitation-of-liability',
      title: 'Limitation of Liability',
      content: `
        <p class="uppercase font-semibold">PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS PROPCONNECT'S LIABILITY.</p>
        
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Disclaimer of Warranties</h3>
        <p>The platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Accuracy or reliability of property information</li>
          <li>Availability of the platform at all times</li>
          <li>Freedom from errors, viruses, or harmful components</li>
          <li>Fitness for a particular purpose</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, PropConnect shall not be liable for:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Indirect, incidental, special, consequential, or punitive damages</li>
          <li>Lost profits, revenues, data, or business opportunities</li>
          <li>Property transaction failures or disputes</li>
          <li>Inaccurate or fraudulent property listings</li>
          <li>Agent misconduct or license issues</li>
          <li>User-generated content or third-party links</li>
        </ul>
        <p class="mt-4">Our total liability shall not exceed the amount you paid to PropConnect in the 12 months preceding the claim.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Indemnification</h3>
        <p>You agree to indemnify and hold harmless PropConnect from any claims arising from:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Your use of the platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Content you post on the platform</li>
        </ul>
      `
    },
    {
      id: 'privacy-data',
      title: 'Privacy and Data Use',
      content: `
        <p>Your use of PropConnect is also governed by our <a href="/privacy" class="text-blue-600 hover:text-blue-700 underline">Privacy Policy</a>, which describes how we collect, use, and protect your personal information.</p>
        
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Data Collection</h3>
        <p>We collect:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Account information (name, email, phone)</li>
          <li>Usage data (searches, views, saved properties)</li>
          <li>Device and browser information</li>
          <li>Cookies and tracking technologies</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Data Sharing</h3>
        <p>We may share your information with:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Agents you contact (name, email, phone, message content)</li>
          <li>Service providers necessary for platform operation</li>
          <li>Law enforcement if legally required</li>
        </ul>
        <p class="mt-4">We never sell your personal information to third parties.</p>
      `
    },
    {
      id: 'termination',
      title: 'Termination',
      content: `
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">By You</h3>
        <p>You may terminate your account at any time by:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Accessing account settings and selecting "Delete Account"</li>
          <li>Contacting us at <a href="mailto:support@propconnect.com" class="text-blue-600 hover:text-blue-700 underline">support@propconnect.com</a></li>
        </ul>
        <p class="mt-4">Upon termination:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Property Seekers: Your saved properties and inquiry history will be deleted</li>
          <li>Agents: Active listings will be removed immediately; subscription fees are non-refundable</li>
        </ul>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">By PropConnect</h3>
        <p>We may suspend or terminate accounts for:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Violation of these Terms</li>
          <li>Fraudulent or illegal activity</li>
          <li>Excessive user complaints</li>
          <li>Non-payment of subscription fees (Agents)</li>
          <li>License revocation or suspension (Agents)</li>
        </ul>
        <p class="mt-4">We will provide notice where possible, but reserve the right to terminate immediately for serious violations.</p>
      `
    },
    {
      id: 'dispute-resolution',
      title: 'Dispute Resolution',
      content: `
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Governing Law</h3>
        <p>These Terms are governed by the laws of the State of [Your State], United States, without regard to conflict of law principles.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Arbitration Agreement</h3>
        <p>Any disputes arising from these Terms or your use of the platform shall be resolved through binding arbitration, except:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Small claims court disputes (under $10,000)</li>
          <li>Intellectual property disputes</li>
          <li>Injunctive or equitable relief</li>
        </ul>
        <p class="mt-4">You waive your right to a jury trial and to participate in class action lawsuits.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Severability</h3>
        <p>If any provision of these Terms is found invalid or unenforceable, the remaining provisions continue in full force and effect.</p>
      `
    },
    {
      id: 'changes-to-terms',
      title: 'Changes to Terms',
      content: `
        <p>We may update these Terms from time to time. When we make changes:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>The "Last Updated" date will be revised</li>
          <li>Significant changes will be announced via email or platform notification</li>
          <li>Continued use of the platform after changes constitutes acceptance</li>
        </ul>
        <p class="mt-4">For material changes affecting Agents (subscription fees, commission structure), we will provide 30 days' notice.</p>
        <p class="mt-4">We encourage you to review these Terms periodically.</p>
      `
    },
    {
      id: 'fair-housing',
      title: 'Fair Housing Compliance',
      content: `
        <p>PropConnect is committed to compliance with the Fair Housing Act and all applicable fair housing laws.</p>
        
        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Prohibited Discrimination</h3>
        <p>It is illegal to discriminate in housing based on:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>Race or color</li>
          <li>National origin</li>
          <li>Religion</li>
          <li>Sex (including sexual orientation and gender identity)</li>
          <li>Familial status (presence of children)</li>
          <li>Disability</li>
        </ul>
        <p class="mt-4">All listings and communications must comply with these protections. Violations will result in immediate listing removal and possible account termination.</p>

        <h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">Reporting Fair Housing Violations</h3>
        <p>If you believe a listing or agent has violated fair housing laws, please report it immediately through our reporting system or contact us at <a href="mailto:fairhousing@propconnect.com" class="text-blue-600 hover:text-blue-700 underline">fairhousing@propconnect.com</a>.</p>
      `
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: `
        <p>For questions about these Terms of Service, please contact us:</p>
        <div class="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p class="font-semibold text-gray-900 mb-4">PropConnect Legal Department</p>
          <p class="text-gray-700">Email: <a href="mailto:legal@propconnect.com" class="text-blue-600 hover:text-blue-700 underline">legal@propconnect.com</a></p>
          <p class="text-gray-700 mt-2">Phone: 1-800-PROP-LAW (1-800-776-7529)</p>
          <p class="text-gray-700 mt-2">Address: 123 Tech Boulevard, Suite 500<br/>San Francisco, CA 94105</p>
          <p class="text-gray-700 mt-4">Business Hours: Monday-Friday, 9:00 AM - 5:00 PM PST</p>
        </div>
        <p class="mt-6">For general support inquiries, visit our <a href="/contact" class="text-blue-600 hover:text-blue-700 underline">Contact Page</a> or email <a href="mailto:support@propconnect.com" class="text-blue-600 hover:text-blue-700 underline">support@propconnect.com</a>.</p>
      `
    }
  ];

  // Scroll to section on mount if hash present
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        setActiveSection(hash);
      }
    }
  }, []);

  // Intersection Observer to track active section
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    termsSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [termsSections]);

  const navigateToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      setTocOpen(false);
      
      // Update URL hash
      window.history.pushState(null, '', `#${sectionId}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Last updated: <time dateTime="2024-01-25">January 25, 2024</time>
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Print terms of service"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                
                <Link 
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Table of Contents - Desktop Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-8">
                <nav className="bg-white rounded-xl shadow-lg border border-gray-100 p-6" aria-label="Table of contents">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                    Contents
                  </h2>
                  <ul className="space-y-2">
                    {termsSections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => navigateToSection(section.id)}
                          className={`text-left w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            activeSection === section.id
                              ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>

            {/* Mobile Table of Contents Toggle */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="w-full flex items-center justify-between bg-white rounded-lg shadow-md border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                aria-expanded={tocOpen}
                aria-controls="mobile-toc"
              >
                <span>Table of Contents</span>
                <svg
                  className={`h-5 w-5 transform transition-transform ${tocOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {tocOpen && (
                <div id="mobile-toc" className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                  <ul className="space-y-2">
                    {termsSections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => navigateToSection(section.id)}
                          className={`text-left w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            activeSection === section.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8 lg:p-12">
                  {/* Important Notice */}
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-8">
                    <div className="flex items-start">
                      <svg className="h-6 w-6 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="ml-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-1">Important Notice</h3>
                        <p className="text-sm text-blue-800">
                          Please read these Terms of Service carefully before using PropConnect. 
                          By accessing or using our platform, you agree to be bound by these terms.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms Sections */}
                  <div className="prose prose-gray max-w-none">
                    {termsSections.map((section, index) => (
                      <section
                        key={section.id}
                        id={section.id}
                        className="scroll-mt-8"
                      >
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                          {index + 1}. {section.title}
                        </h2>
                        <div
                          className="text-gray-700 leading-relaxed space-y-4"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                        {index < termsSections.length - 1 && (
                          <div className="mt-12 mb-8 border-t border-gray-200"></div>
                        )}
                      </section>
                    ))}
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Need More Information?</h3>
                      <p className="text-gray-700 mb-4">
                        If you have questions about these Terms or need clarification on any section, 
                        please don't hesitate to contact us.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                          to="/contact"
                          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Contact Support
                        </Link>
                        <Link
                          to="/privacy"
                          className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          View Privacy Policy
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Acceptance Statement */}
                  <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-900">
                      <strong>By using PropConnect, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Back to Top Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Back to Top
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only styles */}
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white;
            }
            .bg-gradient-to-br {
              background: white !important;
            }
            .shadow-lg, .shadow-md {
              box-shadow: none !important;
            }
            .border {
              border-color: #e5e7eb !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default UV_Terms;