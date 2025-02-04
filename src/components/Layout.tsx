import React from 'react';
import Head from 'next/head';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'WellConnect Pro',
  description = 'Intelligent Mental Health Marketing Platform'
}) => {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Head>
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <Navbar />
        
        <main className="main-content">
          {children}
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default Layout;
