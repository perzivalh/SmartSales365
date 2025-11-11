import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(function FormInput(
  { label, error, helperText, className, ...props },
  ref,
) {
  const baseInput =
    "rounded-2xl border bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm transition focus:outline-none focus:ring-2";
  const inputClass = clsx(
    baseInput,
    error ? "border-red-400 focus:border-red-500 focus:ring-red-200/60" : "border-white/20 focus:border-primary focus:ring-primary/40",
    className,
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-white">{label}</span>
      <input ref={ref} className={inputClass} {...props} />
      {helperText ? <span className="text-xs text-white/70">{helperText}</span> : null}
      {error ? <span className="text-xs font-semibold text-red-500">{error}</span> : null}
    </label>
  );
});
