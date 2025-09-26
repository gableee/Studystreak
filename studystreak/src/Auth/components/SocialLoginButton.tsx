// SocialLoginButton.tsx
import type { JSX, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaGoogle, FaFacebook } from "react-icons/fa";

type Provider = "google" | "facebook";

interface SocialLoginButtonProps {
  provider: Provider;
  label: ReactNode;
}

export default function SocialLoginButton({ provider, label }: SocialLoginButtonProps) {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    });
    if (error) console.error(error.message);
  };

  const icons: Record<Provider, JSX.Element> = {
    google: <FaGoogle size={20} />,
    facebook: <FaFacebook size={24} />,
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/5 transition-colors"
    >
      <span className="flex items-center shrink-0">{icons[provider]}</span>
      <span className="inline-flex items-center">{label}</span>
    </button>
  );
}
