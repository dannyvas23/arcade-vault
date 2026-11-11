"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Section = "biblioteca" | "salon";

// «Biblioteca» está activa también en el detalle y el reproductor de un juego.
function isActive(section: Section, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (section === "biblioteca") {
    return pathname === "/" || pathname.startsWith("/juegos");
  }
  return pathname.startsWith("/salon");
}

function NavView({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links: { section: Section; href: string; label: string }[] = [
    { section: "biblioteca", href: "/", label: "Biblioteca" },
    { section: "salon", href: "/salon", label: "Salón de la Fama" },
  ];

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          {links.map(({ section, href, label }) => {
            const active = isActive(section, pathname);
            return (
              <Link
                key={section}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside
        className={"av-mobile-panel" + (open ? " open" : "")}
        inert={!open}
      >
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        {links.map(({ section, href, label }) => {
          const active = isActive(section, pathname);
          return (
            <Link
              key={section}
              href={href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={close}
            >
              {label}
            </Link>
          );
        })}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

function NavWithPathname() {
  return <NavView pathname={usePathname()} />;
}

// Con `cacheComponents`, `usePathname` suspende en rutas con params que no
// cubre `generateStaticParams` (p. ej. /juegos/no-existe). El fallback pinta
// el Nav sin estado activo para que no desaparezca durante el prerender.
export default function Nav() {
  return (
    <Suspense fallback={<NavView pathname={null} />}>
      <NavWithPathname />
    </Suspense>
  );
}
