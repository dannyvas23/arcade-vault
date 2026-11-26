import type { Metadata } from "next";
import RegisterForm from "@/components/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta · Arcade Vault",
  description: "Crea tu cuenta de jugador en Arcade Vault.",
};

export default function RegistroPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <RegisterForm />
    </div>
  );
}
