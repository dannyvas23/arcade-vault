import type { Metadata } from "next";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar · Arcade Vault",
  description: "Entra a tu cuenta de Arcade Vault.",
};

export default function LoginPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <LoginForm />
    </div>
  );
}
