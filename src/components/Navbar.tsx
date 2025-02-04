import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-logo">
          WellConnect Pro
        </Link>

        <div className={`menu-icon ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link href="/dashboard" className="nav-link">
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/campaigns" className="nav-link">
              Campaigns
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/analytics" className="nav-link">
              Analytics
            </Link>
          </li>
          <li className="nav-item">
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
