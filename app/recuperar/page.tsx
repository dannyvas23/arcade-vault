import type { Metadata } from "next";
import RecoverForm from "@/components/recover-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña · Arcade Vault",
  description: "Pide un enlace para elegir una contraseña nueva.",
};

export default function RecuperarPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <RecoverForm />
    </div>
  );
}
