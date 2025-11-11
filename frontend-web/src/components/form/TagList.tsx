import { useState } from "react";
import type { KeyboardEvent } from "react";

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
    <div className="space-y-3">
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 min-w-[200px] rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={currentValue}
          placeholder="Ej. Motor inverter"
          onChange={(event) => setCurrentValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
          onClick={addValue}
        >
          Anadir
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white"
          >
            {value}
            <button
              type="button"
              className="text-xs font-bold text-white/70 transition hover:text-red-400"
              onClick={() => handleRemove(value)}
              aria-label={`Eliminar ${value}`}
            >
              x
            </button>
          </span>
        ))}
      </div>
      {error ? <span className="text-xs font-semibold text-red-400">{error}</span> : null}
    </div>
  );
}
