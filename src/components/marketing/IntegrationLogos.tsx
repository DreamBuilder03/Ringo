/* ═══════════════════════════════════════════════════════════════════════
   INTEGRATION LOGOS — Real brand marks, rendered in pure Bone (#F3EEE3)
   Source images are background-isolated PNGs stored at /public/pos/*.png
   (already converted to transparent bone-colored silhouettes — no CSS
   blend-mode tricks needed). Heights tuned to ~24–28px in the stack row.
   No color anywhere. Icon-only marks per brand-guideline friendly usage.
   ═══════════════════════════════════════════════════════════════════════ */

type LogoProps = { className?: string };

// One shared wrapper — every logo is an <img> with a fixed height so the
// row stays optically balanced regardless of native aspect ratio.
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
export function OpenTableLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/opentable.png" alt="OpenTable" aspect="aspect-square" />;
}
export function GrubhubLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/grubhub.png" alt="Grubhub" aspect="aspect-[4/3]" />;
}
export function OloLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/olo.png" alt="Olo" aspect="aspect-[7/6]" />;
}
export function OtterLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/otter.png" alt="Otter" aspect="aspect-[11/4]" />;
}
export function PopmenuLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/popmenu.png" alt="Popmenu" aspect="aspect-square" />;
}
export function FocusPOSLogo(p: LogoProps) {
  return <BrandMark {...p} src="/pos/focuspos.png" alt="Focus POS" aspect="aspect-[5/3]" />;
}

/* ═══════════════════════════════════════════════════════════════════════
   LISTS
   `coreStack` = the four priority integrations shown in the calm
   Aesop-style "Works with your existing stack" strip above the marquee.
   `integrationList` = the full lineup for the marquee rows below.
   ═══════════════════════════════════════════════════════════════════════ */
export const coreStack = [
  { name: "Square", Logo: SquareLogo },
  { name: "Toast", Logo: ToastLogo },
  { name: "Clover", Logo: CloverLogo },
  { name: "SpotOn", Logo: SpotOnLogo },
];

export const integrationList = [
  { name: "Square", Logo: SquareLogo },
  { name: "Toast", Logo: ToastLogo },
  { name: "Clover", Logo: CloverLogo },
  { name: "SpotOn", Logo: SpotOnLogo },
  { name: "OpenTable", Logo: OpenTableLogo },
  { name: "Olo", Logo: OloLogo },
  { name: "Popmenu", Logo: PopmenuLogo },
  { name: "Otter", Logo: OtterLogo },
  { name: "Grubhub", Logo: GrubhubLogo },
  { name: "Focus POS", Logo: FocusPOSLogo },
];
