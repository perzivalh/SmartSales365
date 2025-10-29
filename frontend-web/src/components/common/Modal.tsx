import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./Modal.module.css";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

const modalRootId = "smartsales365-modal-root";

function ensureModalRoot() {
  let element = document.getElementById(modalRootId);
  if (!element) {
    element = document.createElement("div");
    element.id = modalRootId;
    document.body.appendChild(element);
  }
  return element;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const modalRoot = ensureModalRoot();

  const content = (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.closeButton} aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );

  return createPortal(content, modalRoot);
}
