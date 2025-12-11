import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const GV_Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Main footer content - 5 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Column 1 - About */}
            <div className="space-y-4">
              <div>
                <Link to="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors duration-200">
                  PropConnect
                </Link>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Find your dream property with trusted real estate agents. Browse thousands of listings across the country.
              </p>
              
              {/* Social media icons */}
              <div className="flex items-center space-x-4 pt-2">
                <a
                  href="https://facebook.com/propconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit PropConnect on Facebook"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com/propconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit PropConnect on Twitter"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/propconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit PropConnect on Instagram"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com/company/propconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit PropConnect on LinkedIn"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Column 2 - Quick Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Quick Links
              </h3>
              <nav className="space-y-3">
                <Link
                  to="/"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Home
                </Link>
                <Link
                  to="/search?listing_type=sale"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  For Sale
                </Link>
                <Link
                  to="/search?listing_type=rent"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  For Rent
                </Link>
                <Link
                  to="/about"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Contact
                </Link>
              </nav>
            </div>

            {/* Column 3 - For Agents */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                For Agents
              </h3>
              <nav className="space-y-3">
                <Link
                  to="/agent/login"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Agent Login
                </Link>
                <Link
                  to="/agent/register"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Register as Agent
                </Link>
                <Link
                  to="/agent/resources"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Agent Resources
                </Link>
              </nav>
            </div>

            {/* Column 4 - Legal */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Legal
              </h3>
              <nav className="space-y-3">
                <Link
                  to="/terms"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/privacy"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/cookies"
                  className="block text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Cookie Policy
                </Link>
              </nav>
            </div>

            {/* Column 5 - Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Contact
              </h3>
              <div className="space-y-3">
                <a
                  href="mailto:info@propconnect.com"
                  className="flex items-center space-x-2 text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <Mail className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <span>info@propconnect.com</span>
                </a>
                
                <a
                  href="tel:+15551234567"
                  className="flex items-center space-x-2 text-base text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <Phone className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <span>(555) 123-4567</span>
                </a>
                
                <div className="flex items-start space-x-2 text-sm text-gray-400">
                  <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    123 Real Estate Ave<br />
                    Suite 100<br />
                    Miami, FL 33131
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section - Copyright */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500 text-center">
              © {currentYear} PropConnect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;