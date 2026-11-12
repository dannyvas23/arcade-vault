"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Sección que aparece con una transición al entrar en el viewport.
// `.reveal` (opacity 0) pasa a `.reveal.in` cuando se ve al menos un 12 %.
export default function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${className} reveal${shown ? " in" : ""}`.trim()}
    >
      {children}
    </section>
  );
}
