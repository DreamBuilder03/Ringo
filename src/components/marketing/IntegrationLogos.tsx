/* ═══════════════════════════════════════════════════════════════════════
   INTEGRATION LOGOS — Brand-recognizable monochrome marks
   Each logo uses currentColor so the parent can tint to Bone (#F3EEE3).
   Heights tuned to 24px in the calm stack row, 28px in the marquee.
   No color anywhere. Icon + wordmark set by brand per brand guideline.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Square: open rounded square with inner rounded square (actual brand mark) ── */
export function SquareLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 32" fill="none" className={className} aria-label="Square">
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" stroke="currentColor" strokeWidth="2.2" />
      <rect x="10" y="10" width="12" height="12" rx="2" fill="currentColor" />
      <text x="40" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="600" letterSpacing="-0.015em" fill="currentColor">Square</text>
    </svg>
  );
}

/* ── Toast: rounded bold wordmark with bite-mark dot over the 'o' (brand cue) ── */
export function ToastLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 108 32" fill="currentColor" className={className} aria-label="Toast">
      <text x="0" y="25" fontFamily="'Inter',system-ui,sans-serif" fontSize="24" fontWeight="800" letterSpacing="-0.045em">toast</text>
      {/* Tittle-style bite mark above the 'oa' seam — brand nod without colour */}
      <circle cx="28" cy="8" r="2.4" fill="currentColor" />
    </svg>
  );
}

/* ── Clover: four-leaf trefoil mark + wordmark (brand-accurate silhouette) ── */
export function CloverLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 32" fill="currentColor" className={className} aria-label="Clover">
      <g transform="translate(16,16)">
        {/* Four rounded leaves */}
        <circle cx="0" cy="-7" r="5.3" />
        <circle cx="7" cy="0" r="5.3" />
        <circle cx="0" cy="7" r="5.3" />
        <circle cx="-7" cy="0" r="5.3" />
        {/* Central hole punched through */}
        <circle cx="0" cy="0" r="2.4" fill="#0A0A0A" />
      </g>
      <text x="36" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="600" letterSpacing="-0.01em">Clover</text>
    </svg>
  );
}

/* ── SpotOn: target ring mark + wordmark ── */
export function SpotOnLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 32" fill="currentColor" className={className} aria-label="SpotOn">
      <circle cx="14" cy="16" r="12.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="14" cy="16" r="4.5" />
      <text x="34" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="700" letterSpacing="-0.015em">SpotOn</text>
    </svg>
  );
}

/* ── NCR Aloha: triangular 'A' mark + wordmark ── */
export function AlohaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 118 32" fill="currentColor" className={className} aria-label="Aloha">
      <path d="M4 26 L14 6 L24 26 Z M10 21 L18 21" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <text x="32" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="700" letterSpacing="-0.02em">Aloha</text>
    </svg>
  );
}

/* ── GoHighLevel: concentric "GHL" mark + wordmark ── */
export function GHLLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 164 32" fill="currentColor" className={className} aria-label="GoHighLevel">
      {/* Stylised G: outer ring + inner bar (HighLevel's ownable cue) */}
      <g transform="translate(0,2)">
        <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 14 L24 14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M19 14 L19 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <text x="36" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="15.5" fontWeight="700" letterSpacing="-0.01em">GoHighLevel</text>
    </svg>
  );
}

/* ── DoorDash: D-shaped brand mark + wordmark ── */
export function DoorDashLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 142 32" fill="currentColor" className={className} aria-label="DoorDash">
      <path d="M2 10 H18 a8 8 0 0 1 0 16 H2 a1 1 0 0 1 -1 -1 V11 a1 1 0 0 1 1 -1 Z M6 14 V22 H17 a4 4 0 0 0 0 -8 Z" fillRule="evenodd" />
      <text x="30" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="700" letterSpacing="-0.025em">DoorDash</text>
    </svg>
  );
}

/* ── Uber Eats: bold + regular wordmark pair ── */
export function UberEatsLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 134 32" fill="currentColor" className={className} aria-label="Uber Eats">
      <text x="0" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="18" fontWeight="800" letterSpacing="-0.03em">Uber</text>
      <text x="54" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="18" fontWeight="300" letterSpacing="-0.01em">Eats</text>
    </svg>
  );
}

/* ── Grubhub: tight wordmark ── */
export function GrubhubLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 32" fill="currentColor" className={className} aria-label="Grubhub">
      <text x="0" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.03em">Grubhub</text>
    </svg>
  );
}

/* ── Stripe: slanted S-stripe mark + wordmark ── */
export function StripeLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 122 32" fill="currentColor" className={className} aria-label="Stripe">
      <g transform="translate(0,4)">
        <path d="M4 20 C6 23 10 24 13 24 C17 24 20 22 20 18 C20 15 17 14 14 13 C11.5 12 10 11.5 10 10 C10 8.8 11 8 13 8 C15 8 17 9 18.5 10.5 L20 7 C18 5.5 15.5 4.5 13 4.5 C9 4.5 6 6.5 6 10.2 C6 13 8.5 14.2 11.5 15 C14 15.6 15.5 16.2 15.5 17.8 C15.5 19.2 14.2 20 12.5 20 C10.2 20 8 18.8 6.5 17.2 Z" />
      </g>
      <text x="28" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.03em">Stripe</text>
    </svg>
  );
}

/* ── Twilio: rounded dot-cluster mark + wordmark ── */
export function TwilioLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 126 32" fill="currentColor" className={className} aria-label="Twilio">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="11" cy="11" r="2.4" />
      <circle cx="21" cy="11" r="2.4" />
      <circle cx="11" cy="21" r="2.4" />
      <circle cx="21" cy="21" r="2.4" />
      <text x="36" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="17" fontWeight="600" letterSpacing="-0.015em">Twilio</text>
    </svg>
  );
}

/* ── OpenTable: bowl mark + wordmark ── */
export function OpenTableLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 154 32" fill="currentColor" className={className} aria-label="OpenTable">
      <circle cx="14" cy="16" r="12.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 16 L23 16 M14 16 L14 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <text x="34" y="22" fontFamily="'Inter',system-ui,sans-serif" fontSize="16.5" fontWeight="600" letterSpacing="-0.015em">OpenTable</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LISTS
   `coreStack` = the four brand-priority integrations shown in the calm
   Aesop-style "Works with your existing stack" strip above the marquee.
   `integrationList` = full 12 for the marquee rows below.
   ═══════════════════════════════════════════════════════════════════════ */
export const coreStack = [
  { name: "Square", Logo: SquareLogo },
  { name: "Toast", Logo: ToastLogo },
  { name: "Clover", Logo: CloverLogo },
  { name: "GoHighLevel", Logo: GHLLogo },
];

export const integrationList = [
  { name: "Square", Logo: SquareLogo },
  { name: "Toast", Logo: ToastLogo },
  { name: "Clover", Logo: CloverLogo },
  { name: "SpotOn", Logo: SpotOnLogo },
  { name: "Aloha", Logo: AlohaLogo },
  { name: "GoHighLevel", Logo: GHLLogo },
  { name: "DoorDash", Logo: DoorDashLogo },
  { name: "Uber Eats", Logo: UberEatsLogo },
  { name: "Grubhub", Logo: GrubhubLogo },
  { name: "Stripe", Logo: StripeLogo },
  { name: "Twilio", Logo: TwilioLogo },
  { name: "OpenTable", Logo: OpenTableLogo },
];
