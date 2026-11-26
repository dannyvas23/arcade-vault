import type { Metadata } from "next";
import ResetForm from "@/components/reset-form";

export const metadata: Metadata = {
  title: "Nueva contraseña · Arcade Vault",
  description: "Elige una contraseña nueva para tu cuenta.",
};

// El proxy redirige a `/recuperar` si no hay sesión: aquí solo se llega con la
// sesión de recuperación que abre el enlace del correo.
export default function RestablecerPage() {
  return (
    <div className="av-auth-wrap fade-in">
      <ResetForm />
    </div>
  );
}
