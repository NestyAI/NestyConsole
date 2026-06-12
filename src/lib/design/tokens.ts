/** Titanium Noir design tokens. Keep exports backward-compatible. */

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan/55 focus-visible:ring-offset-2 focus-visible:ring-offset-neural-void";

export const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.12] bg-neural-input/90 px-3.5 py-2.5 text-sm text-neural-text-primary shadow-inner shadow-black/15 outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-neural-text-muted hover:border-white/[0.18] focus:border-neural-cyan/45 focus:bg-neural-input disabled:cursor-not-allowed disabled:opacity-60 " +
  FOCUS_RING;

export const TEXTAREA_CLASS =
  "w-full resize-y rounded-xl border border-white/[0.12] bg-neural-input/90 px-3.5 py-3 text-sm text-neural-text-primary shadow-inner shadow-black/15 outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-neural-text-muted hover:border-white/[0.18] focus:border-neural-cyan/45 focus:bg-neural-input disabled:cursor-not-allowed disabled:opacity-60 " +
  FOCUS_RING;

export const SELECT_CLASS =
  "w-full appearance-none rounded-xl border border-white/[0.12] bg-neural-input/90 px-3.5 py-2.5 text-sm text-neural-text-primary shadow-inner shadow-black/15 outline-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-white/[0.18] focus:border-neural-cyan/45 focus:bg-neural-input disabled:cursor-not-allowed disabled:opacity-60 " +
  FOCUS_RING;

const BUTTON_BASE =
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-[transform,border-color,background-color,color,box-shadow] duration-150 active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_VARIANTS = {
  primary:
    `${BUTTON_BASE} border-neural-cyan/35 bg-neural-cyan/15 text-cyan-50 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:border-neural-cyan/55 hover:bg-neural-cyan/22 ` +
    FOCUS_RING,
  secondary:
    `${BUTTON_BASE} border-white/[0.12] bg-white/[0.055] text-neural-text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:border-white/[0.22] hover:bg-white/[0.085] ` +
    FOCUS_RING,
  ghost:
    `${BUTTON_BASE} border-transparent bg-transparent px-3 text-neural-text-secondary hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-neural-text-primary ` +
    FOCUS_RING,
  danger:
    `${BUTTON_BASE} border-neural-red/35 bg-neural-red/12 text-rose-100 hover:border-neural-red/55 hover:bg-neural-red/20 ` +
    FOCUS_RING,
  icon:
    "inline-flex size-10 items-center justify-center rounded-xl border border-transparent text-neural-text-secondary transition-[transform,border-color,background-color,color] duration-150 hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-neural-text-primary active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export const PAGE_SECTION_CLASS = "space-y-6 lg:space-y-8";
export const PAGE_HEADER_TITLE_CLASS =
  "text-balance text-3xl font-semibold tracking-[-0.045em] text-neural-text-primary sm:text-4xl";
export const PAGE_HEADER_DESC_CLASS =
  "mt-3 max-w-3xl text-pretty text-sm leading-7 text-neural-text-secondary sm:text-base";
export const SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.1em] text-neural-text-secondary";

export const SURFACE_CLASSES = {
  base: "glass-base",
  raised: "glass-raised",
  overlay: "glass-overlay",
  accent: "glass-accent"
} as const;

export type SurfaceTier = keyof typeof SURFACE_CLASSES;
