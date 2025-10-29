import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import styles from "./FormField.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(function FormInput(
  { label, error, helperText, ...props },
  ref,
) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input ref={ref} className={styles.input} {...props} />
      {helperText ? <span className={styles.helper}>{helperText}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
});
