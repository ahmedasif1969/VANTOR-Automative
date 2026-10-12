import { ArrowUpRight, Check, Copy, Download } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionHeading } from "./MotionHeading";
import { vehicleNames } from "../lib/vehicles";
import { notifyMotionLayoutChange } from "../lib/motionLayout";
import {
  prepareEnquiry,
  validateEnquiry,
  type EnquiryErrors,
} from "../lib/enquiry";

const questions = [
  [
    "How does a private viewing work?",
    "Share your preferred vehicle and date in an enquiry. The viewing, vehicle availability, and any test drive are confirmed directly before an appointment is booked.",
  ],
  [
    "Can you source a specific vehicle?",
    "Use “Bespoke sourcing” to describe the marque, model, finish, and other details that matter to you. A specialist can then discuss a suitable search.",
  ],
  [
    "Where can I review the vehicle history?",
    "Request the inspection and provenance information during your enquiry. Specification, history, price, and delivery arrangements should be confirmed before any purchase.",
  ],
];

export function Contact({
  interest,
  onInterestChange,
}: {
  interest: string;
  onInterestChange: (value: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [errors, setErrors] = useState<EnquiryErrors>({});
  useGSAP(
    () => {
      const match = gsap.matchMedia();
      match.add("(prefers-reduced-motion: no-preference)", () => {
        if (draft)
          gsap.from(".enquiry-draft", {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
          });
      });
      const frame = requestAnimationFrame(notifyMotionLayoutChange);
      return () => {
        cancelAnimationFrame(frame);
        match.revert();
      };
    },
    { scope: root, dependencies: [draft], revertOnUpdate: true },
  );
  useEffect(() => {
    setDraft("");
    setCopyStatus("");
  }, [interest]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const data = {
      name: String(values.get("name") || ""),
      email: String(values.get("email") || ""),
      phone: String(values.get("phone") || ""),
      date: String(values.get("date") || ""),
      message: String(values.get("message") || ""),
      interest,
    };
    const nextErrors = validateEnquiry(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.currentTarget
        .querySelector<HTMLElement>(
          '[name="' + Object.keys(nextErrors)[0] + '"]',
        )
        ?.focus();
      return;
    }
    setDraft(prepareEnquiry(data));
    setCopyStatus("");
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([draft], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vantor-enquiry.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus("Enquiry copied.");
    } catch {
      setCopyStatus(
        "Copy is unavailable here. Select the enquiry text or download it below.",
      );
    }
  };

  return (
    <section
      id="contact"
      ref={root}
      className="bg-ink px-5 py-28 md:px-10 md:py-40 lg:px-16"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-16">
          <div
            className="mb-10 h-0.5 origin-left bg-signal"
            data-motion-rule
            aria-hidden="true"
          />
          <p className="eyebrow" data-motion-copy>
            Private viewing & bespoke sourcing
          </p>
          <MotionHeading
            lines={["Your next chapter", "starts here."]}
            className="mt-7 max-w-6xl text-[clamp(2.8rem,7vw,7.5rem)] font-medium uppercase leading-[.9] tracking-[-.065em]"
          />
        </div>
        <div className="grid gap-16 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <p
              className="max-w-sm text-lg leading-relaxed text-white/65"
              data-motion-copy
            >
              A machine that speaks to you. An experience shaped around you.
              Start with a conversation.
            </p>
            <a href="#enquiry-form" className="button button-dark mt-8">
              Prepare your enquiry <ArrowUpRight size={16} />
            </a>
            <p className="mt-6 text-xs leading-relaxed text-white/45">
              Fictional contact placeholders:
              <br />
              concierge@vantor.example
              <br />
              +1 (202) 555-0147
            </p>
            <div className="mt-10 border-t border-white/15">
              {questions.map(([question, answer]) => (
                <details
                  className="border-b border-white/15 py-5"
                  key={question}
                  onToggle={() => ScrollTrigger.refresh(true)}
                >
                  <summary className="cursor-pointer pr-5 text-sm font-medium">
                    {question}
                  </summary>
                  <p className="faq-answer mt-4 max-w-lg text-sm leading-relaxed text-white/60">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
          <div>
            <form
              id="enquiry-form"
              noValidate
              onSubmit={submit}
              onChange={() => {
                if (draft) setDraft("");
                setErrors({});
              }}
              className="enquiry-form grid gap-6 sm:grid-cols-2"
            >
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Full name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <span id="name-error" className="field-error">
                    {errors.name}
                  </span>
                )}
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <span id="email-error" className="field-error">
                    {errors.email}
                  </span>
                )}
              </label>
              <label>
                Phone <span className="text-white/40">(optional)</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  placeholder="Include country code"
                />
              </label>
              <label>
                Preferred date <span className="text-white/40">(optional)</span>
                <input name="date" type="date" />
              </label>
              <label className="sm:col-span-2">
                Preferred vehicle
                <select
                  id="preferred-vehicle"
                  name="interest"
                  required
                  value={interest}
                  onChange={(event) => onInterestChange(event.target.value)}
                  aria-invalid={!!errors.interest}
                  aria-describedby={
                    errors.interest ? "interest-error" : undefined
                  }
                >
                  <option value="">Choose a vehicle or service</option>
                  <option>General consultation</option>
                  {vehicleNames.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                  <option>Bespoke sourcing</option>
                </select>
                {errors.interest && (
                  <span id="interest-error" className="field-error">
                    {errors.interest}
                  </span>
                )}
              </label>
              <label className="sm:col-span-2">
                Message
                <textarea
                  name="message"
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder="A particular vehicle, a finish, a feeling. Tell us what matters."
                  aria-invalid={!!errors.message}
                  aria-describedby={
                    errors.message ? "message-error" : undefined
                  }
                />
                {errors.message && (
                  <span id="message-error" className="field-error">
                    {errors.message}
                  </span>
                )}
              </label>
              {!!Object.keys(errors).length && (
                <p role="alert" className="field-error sm:col-span-2">
                  Please correct the highlighted fields. Nothing has been sent.
                </p>
              )}
              <div className="sm:col-span-2">
                <button type="submit" className="button button-light">
                  Prepare enquiry <ArrowUpRight size={16} />
                </button>
                <p className="mt-4 text-xs leading-relaxed text-white/45">
                  VANTOR is a concept showroom. This form prepares an enquiry
                  you can copy or download; it does not send your information or
                  book an appointment.
                </p>
              </div>
            </form>
            {draft && (
              <div className="enquiry-draft mt-8 border border-white/20 p-6">
                <p
                  role="status"
                  className="mb-4 flex items-center gap-2 text-sm"
                >
                  <Check size={16} className="text-signal" /> Your enquiry is
                  ready to review — not sent or stored
                </p>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-white/65">
                  {draft}
                </pre>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={copy}
                    className="button button-dark"
                  >
                    <Copy size={14} /> Copy enquiry
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="button button-dark"
                  >
                    <Download size={14} /> Download enquiry
                  </button>
                </div>
                <p role="status" className="mt-3 text-xs text-white/60">
                  {copyStatus}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
