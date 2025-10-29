import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import styles from "./FormField.module.css";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, helperText, children, ...props },
  ref,
) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select ref={ref} className={styles.select} {...props}>
        {children}
      </select>
      {helperText ? <span className={styles.helper}>{helperText}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
});
