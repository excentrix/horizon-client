'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The Supabase client will automatically handle the code exchange
    // and fire the onAuthStateChange event, which AuthContext listens to.
    // This page's primary job is to exist so the redirect works,
    // and potentially handle edge cases or errors.
    
    // We can verify if the URL contains error parameters.
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
        console.error('Auth callback error:', params.get('error_description'));
        router.push('/login?error=' + params.get('error_description'));
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
