import clsx from "clsx";
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, helperText, children, className, ...props },
  ref,
) {
  const baseClass =
    "rounded-2xl border bg-white/95 px-4 py-3 text-sm font-display font-medium text-slate-900 shadow-sm transition focus:outline-none focus:ring-2";
  const selectClass = clsx(
    baseClass,
    error ? "border-red-400 focus:border-red-500 focus:ring-red-200/60" : "border-white/20 focus:border-primary focus:ring-primary/40",
    className,
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-white">{label}</span>
      <select ref={ref} className={selectClass} {...props}>
        {children}
      </select>
      {helperText ? <span className="text-xs text-white/70">{helperText}</span> : null}
      {error ? <span className="text-xs font-semibold text-red-500">{error}</span> : null}
    </label>
  );
});
