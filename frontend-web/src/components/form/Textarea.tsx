import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import styles from "./FormField.module.css";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, error, helperText, ...props },
  ref,
) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <textarea ref={ref} className={styles.textarea} {...props} />
      {helperText ? <span className={styles.helper}>{helperText}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
});
