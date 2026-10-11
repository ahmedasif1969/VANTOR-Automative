import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const links = [
  ["Collection", "#collection"],
  ["Our Story", "#story"],
  ["Experience", "#experience"],
  ["Contact", "#contact"],
];

export function Navigation() {
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onBreakpoint = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, []);

  useGSAP(
    () => {
      const element = root.current?.querySelector(".nav-shell");
      ScrollTrigger.create({
        start: 40,
        end: "max",
        onUpdate: () =>
          element?.classList.toggle("is-scrolled", window.scrollY > 40),
      });
      element?.classList.toggle("is-scrolled", window.scrollY > 40);
    },
    { scope: root },
  );

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      gsap.to("#mobile-navigation", {
        height: open ? "auto" : 0,
        duration: reduced ? 0 : 0.4,
        ease: "power3.inOut",
        overwrite: true,
      });
      if (open && !reduced)
        gsap.fromTo(
          "#mobile-navigation a",
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.045, overwrite: true },
        );
    },
    { scope: root, dependencies: [open] },
  );

  return (
    <header
      ref={root}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-6"
    >
      <nav
        aria-label="Main navigation"
        className="nav-shell mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3 md:px-6"
      >
        <a className="brand-mark" href="#top" aria-label="VANTOR home">
          VAN<span>TOR</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map(([label, href]) => (
            <a className="nav-link" href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
        <a
          className="button button-light hidden md:inline-flex"
          href="#contact"
        >
          Private viewing
        </a>
        <button
          ref={toggle}
          type="button"
          className="grid size-11 place-items-center md:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <div
        id="mobile-navigation"
        aria-hidden={!open}
        className="mobile-menu md:hidden"
      >
        {links.map(([label, href]) => (
          <a
            href={href}
            key={href}
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
      </div>
    </header>
  );
}
