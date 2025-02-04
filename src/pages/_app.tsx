import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/lib/context/AuthContext';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Client-side authentication check
    const user = localStorage.getItem('user');
    
    // Redirect logic
    if (!user && router.pathname !== '/login') {
      router.push('/login');
    } else if (user && router.pathname === '/login') {
      router.push('/dashboard');
    }
  }, [router.pathname]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
