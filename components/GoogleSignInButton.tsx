// components/GoogleSignInButton.tsx
'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleSignInButton() {
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInButton'),
          { theme: 'outline', size: 'large', width: 300 }
        );
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  }, []);

  const handleGoogleSignIn = async (response: any) => {
    try {
      const res = await fetch('/api/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store token and redirect
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        console.error('Google sign-in failed:', data.error);
        alert('Google sign-in failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      alert('Error during Google sign-in. Please try again.');
    }
  };

  return <div id="googleSignInButton" className="w-full flex justify-center"></div>;
}