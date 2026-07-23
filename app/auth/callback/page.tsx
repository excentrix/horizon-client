'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const completeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const errorDescription = params.get("error_description");
      const code = params.get("code");
      // Supabase invite/magic-link/recovery emails can use this older token_hash+type style
      // instead of the PKCE `code` style OAuth uses — which one arrives depends on the Supabase
      // project's email template config, not something this app controls. Handle both so an org
      // "Add Member" / CSV invite (see apps/institutions/invite_service.py) actually completes.
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(errorDescription ?? error)}`);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`);
        }
        return;
      }

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "invite" | "magiclink" | "recovery" | "email",
        });
        if (verifyError) {
          router.replace(`/login?error=${encodeURIComponent(verifyError.message)}`);
        }
      }
    };

    void completeAuth();
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
