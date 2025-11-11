import clsx from "clsx";
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, error, helperText, className, rows = 4, ...props },
  ref,
) {
  const baseClass =
    "rounded-2xl border bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm transition focus:outline-none focus:ring-2";
  const textareaClass = clsx(
    baseClass,
    error ? "border-red-400 focus:border-red-500 focus:ring-red-200/60" : "border-white/20 focus:border-primary focus:ring-primary/40",
    "min-h-[120px]",
    className,
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-white">{label}</span>
      <textarea ref={ref} rows={rows} className={textareaClass} {...props} />
      {helperText ? <span className="text-xs text-white/70">{helperText}</span> : null}
      {error ? <span className="text-xs font-semibold text-red-500">{error}</span> : null}
    </label>
  );
});
