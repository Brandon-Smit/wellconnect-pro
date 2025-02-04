import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { UserProfile } from './UserProfile';
import { NotificationBell } from './NotificationBell';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b shadow-sm p-4 flex justify-between items-center">
      <div className="flex items-center">
        <input 
          type="text" 
          placeholder="Search campaigns, contacts..." 
          className="w-96 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center space-x-4">
        <NotificationBell />
        <ThemeToggle />
        <UserProfile />
      </div>
    </header>
  );
};

export default Header;
