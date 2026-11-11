import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="fade-in"
      style={{ textAlign: "center", padding: "96px 32px" }}
    >
      <div
        className="pixel neon-magenta"
        style={{ fontSize: "clamp(32px, 8vw, 64px)", marginBottom: 20 }}
      >
        404
      </div>
      <div className="pixel" style={{ fontSize: 14, marginBottom: 12 }}>
        JUEGO NO ENCONTRADO
      </div>
      <p style={{ color: "var(--ink-dim)", marginBottom: 32 }}>
        Esta página no existe en el Vault. Vuelve a la biblioteca y elige otro
        juego.
      </p>
      <Link href="/juegos" className="btn lg">
        VOLVER AL VAULT
      </Link>
    </div>
  );
}
