import { ArrowUp, Instagram, Linkedin, Youtube } from "lucide-react";
import { scrollToSection } from "../lib/useSmoothScroll";

export function Footer() {
  return (
    <footer className="border-t border-white/15 bg-ink px-5 pb-8 pt-12 md:px-10 lg:px-16">
      <div className="footer-content mx-auto max-w-[1600px]">
        <div className="grid gap-10 py-10 text-sm md:grid-cols-4">
          <div className="md:col-span-2">
            <a className="brand-mark !text-3xl" href="#top">
              VAN<span>TOR</span>
            </a>
            <p className="mt-3 max-w-xs text-white/60">
              Driven beyond ordinary.
              <br />A considered perspective on exceptional machines.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                [Instagram, "Instagram", "https://www.instagram.com/"],
                [Linkedin, "LinkedIn", "https://www.linkedin.com/"],
                [Youtube, "YouTube", "https://www.youtube.com/"],
              ].map(([Icon, name, href]) => {
                const SocialIcon = Icon as typeof Instagram;
                return (
                  <a
                    key={String(name)}
                    href={String(href)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name + " — placeholder destination"}
                    className="grid size-11 place-items-center border border-white/20 hover:border-signal"
                  >
                    <SocialIcon size={17} />
                  </a>
                );
              })}
              <p className="self-center text-[10px] text-white/40">
                Placeholder
                <br />
                social links
              </p>
            </div>
            <a
              href="/IMAGE-CREDITS.md"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block text-xs text-white/45 underline underline-offset-4"
            >
              Photography credits & licenses
            </a>
          </div>
          <nav
            aria-label="Footer navigation"
            className="space-y-3 text-white/60"
          >
            {[
              ["Collection", "#collection"],
              ["Our Story", "#story"],
              ["Experience", "#experience"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a className="nav-link block w-fit" key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="space-y-3 text-white/60 md:text-right">
            <p>Fictional showroom concept</p>
            <p>concierge@vantor.example</p>
            <p>+1 (202) 555-0147</p>
            <p className="text-xs text-white/40">Contact placeholders only</p>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-3 hover:text-white"
              onClick={() => scrollToSection("top")}
            >
              Back to top <ArrowUp size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-white/20 pt-6 font-mono text-[10px] uppercase tracking-[.14em] text-white/45 md:flex-row">
          <span>© {new Date().getFullYear()} VANTOR Automotive</span>
          <span>Independent. Exacting. Discreet.</span>
        </div>
      </div>
    </footer>
  );
}
