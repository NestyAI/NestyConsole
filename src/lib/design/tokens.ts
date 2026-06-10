/** Premium Control Console design tokens — visual only, no runtime behavior. */

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan/35 focus-visible:ring-offset-2 focus-visible:ring-offset-neural-void";

export const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-neural-input px-3 py-2 text-sm text-neural-text-primary outline-none transition placeholder:text-neural-text-muted disabled:cursor-not-allowed disabled:opacity-60 " +
  FOCUS_RING;

export const TEXTAREA_CLASS =
  "w-full rounded-xl border border-white/10 bg-neural-input px-3 py-2.5 text-sm text-neural-text-primary outline-none transition placeholder:text-neural-text-muted disabled:cursor-not-allowed disabled:opacity-60 resize-y " +
  FOCUS_RING;

export const SELECT_CLASS =
  "w-full appearance-none rounded-xl border border-white/10 bg-neural-input px-3 py-2 text-sm text-neural-text-primary outline-none transition disabled:cursor-not-allowed disabled:opacity-60 " +
  FOCUS_RING;

export const BUTTON_VARIANTS = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-neural-cyan/30 bg-neural-cyan/12 px-3.5 py-2 text-sm font-medium text-neural-cyan transition hover:border-neural-cyan/45 hover:bg-neural-cyan/18 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING,
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-neural-text-primary transition hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING,
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm font-medium text-neural-text-secondary transition hover:bg-white/[0.05] hover:text-neural-text-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING,
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-neural-red/30 bg-neural-red/10 px-3.5 py-2 text-sm font-medium text-rose-100 transition hover:border-neural-red/45 hover:bg-neural-red/16 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING,
  icon:
    "inline-flex items-center justify-center rounded-lg border border-transparent p-1.5 text-neural-text-secondary transition hover:bg-white/[0.06] hover:text-neural-text-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 " +
    FOCUS_RING
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export const PAGE_SECTION_CLASS = "space-y-6";
export const PAGE_HEADER_TITLE_CLASS = "text-2xl font-semibold tracking-[-0.04em] text-neural-text-primary sm:text-3xl";
export const PAGE_HEADER_DESC_CLASS = "mt-2 max-w-2xl text-sm leading-relaxed text-neural-text-secondary";
export const SECTION_LABEL_CLASS =
  "font-medium text-[11px] uppercase tracking-[0.1em] text-neural-text-secondary";
