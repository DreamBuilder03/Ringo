/* ═══════════════════════════════════════════════════════════════════════
   INTEGRATION LOGOS
   Two distinct sets:
     • MONO (bone, transparent) — used in the calm "Works with your
       existing stack" strip above the marquee. Pure-monochrome-safe.
     • COLOR (original brand imagery) — used in the rotating marquee rows.
       These are the full-color source assets Misael uploaded. Loman-style
       parade of colored brand chips. Rendered as rounded square tiles.
   ═══════════════════════════════════════════════════════════════════════ */

type LogoProps = { className?: string };

// Shared wrapper — every logo is an <img> sized by height with aspect lock.
function BrandMark({
  src,
  alt,
  className = "",
  aspect = "aspect-[3/1]",
}: LogoProps & { src: string; alt: string; aspect?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${aspect} w-auto object-contain select-none pointer-events-none`}
      draggable={false}
    />
  );
}

// ── MONO set (bone silhouettes on transparent bg) ─────────────────────────
export function SquareLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/square.png" alt="Square" aspect="aspect-square" />;
}
export function ToastLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/toast.png" alt="Toast" aspect="aspect-square" />;
}
export function CloverLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/clover.png" alt="Clover" aspect="aspect-square" />;
}
export function SpotOnLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/spoton.png" alt="SpotOn" aspect="aspect-[3/4]" />;
}

// ── COLOR set (original brand JPG/PNG assets, rendered as rounded chips) ──
// Because the source images carry their own brand-color background, we
// render them as square tiles and let each image's internal layout speak.
function ColorChip({ src, alt, className = "" }: LogoProps & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} aspect-square w-auto object-cover rounded-xl select-none pointer-events-none shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]`}
      draggable={false}
    />
  );
}

export const colorIntegrations = [
  { name: "Square",    src: "/pos/square.jpg" },
  { name: "Toast",     src: "/pos/toast.jpg" },
  { name: "Clover",    src: "/pos/clover.jpg" },
  { name: "SpotOn",    src: "/pos/spoton.jpg" },
  { name: "OpenTable", src: "/pos/opentable.jpg" },
  { name: "Olo",       src: "/pos/olo.jpg" },
  { name: "Popmenu",   src: "/pos/popmenu.jpg" },
  { name: "Otter",     src: "/pos/otter.jpg" },
  { name: "Grubhub",   src: "/pos/grubhub.png" },
  { name: "Focus POS", src: "/pos/focuspos.png" },
];

export function ColorLogo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <ColorChip src={src} alt={alt} className={className} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   LISTS
   coreStack       — 4 monochrome bone logos for the calm stack strip
   integrationList — 10 full-color source brand chips for the rotating marquee
   ═══════════════════════════════════════════════════════════════════════ */
export const coreStack = [
  { name: "Square", Logo: SquareLogo },
  { name: "Toast", Logo: ToastLogo },
  { name: "Clover", Logo: CloverLogo },
  { name: "SpotOn", Logo: SpotOnLogo },
];

export const integrationList = colorIntegrations;
