import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            WellConnect Pro
          </div>
          
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/contact">Contact</Link>
          </div>
          
          <div className="footer-social">
            <a href="https://twitter.com/wellconnectpro" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://linkedin.com/company/wellconnectpro" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} WellConnect Pro. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
