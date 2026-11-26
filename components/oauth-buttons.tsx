"use client";

import { useFormStatus } from "react-dom";
import { signInWithProvider, type OAuthProvider } from "@/lib/actions/auth";

function ProviderButton({ icon, label }: { icon: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn ghost"
      disabled={pending}
      aria-busy={pending}
    >
      <span aria-hidden="true">{icon}</span> {label}
    </button>
  );
}

const PROVIDERS: { provider: OAuthProvider; icon: string; label: string }[] = [
  { provider: "google", icon: "◆", label: "GOOGLE" },
  { provider: "github", icon: "▣", label: "GITHUB" },
];

// Botones de acceso con Google y GitHub (en `/login` y `/registro`). Cada uno
// es un formulario que invoca `signInWithProvider` en el servidor.
export default function OAuthButtons() {
  return (
    <>
      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        {PROVIDERS.map(({ provider, icon, label }) => (
          <form key={provider} action={signInWithProvider.bind(null, provider)}>
            <ProviderButton icon={icon} label={label} />
          </form>
        ))}
      </div>
    </>
  );
}
