import { useState } from "react";
import type { KeyboardEvent } from "react";

import styles from "./TagList.module.css";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
};

export function TagList({ label, values, onChange, error }: Props) {
  const [currentValue, setCurrentValue] = useState("");

  function addValue() {
    const value = currentValue.trim();
    if (!value) return;
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    setCurrentValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addValue();
    }
  }

  function handleRemove(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.form}>
        <input
          className={styles.input}
          value={currentValue}
          placeholder="Ej. Motor inverter"
          onChange={(event) => setCurrentValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className={styles.addButton} onClick={addValue}>
          Anadir
        </button>
      </div>
      <div className={styles.tags}>
        {values.map((value) => (
          <span key={value} className={styles.tag}>
            {value}
            <button type="button" onClick={() => handleRemove(value)}>
              x
            </button>
          </span>
        ))}
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
