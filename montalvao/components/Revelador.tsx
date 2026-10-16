"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Um IntersectionObserver para todos os elementos com data-revelar (entrada sutil na rolagem). */
export function Revelador() {
  const pathname = usePathname();
  useEffect(() => {
    const alvos = document.querySelectorAll<HTMLElement>("[data-revelar]:not(.visivel)");
    if (!("IntersectionObserver" in window)) {
      alvos.forEach((el) => el.classList.add("visivel"));
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("visivel");
            observador.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    alvos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [pathname]);
  return null;
}
