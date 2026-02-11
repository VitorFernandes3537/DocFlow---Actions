"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="df-modal-root" role="dialog" aria-modal>
      <button
        type="button"
        className="df-modal-backdrop"
        aria-label="Fechar modal"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn("df-modal-panel", className)}>
        <header className="df-modal-header">
          <strong>{title ?? "Detalhes"}</strong>
          <button
            type="button"
            className="df-modal-close"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} />
          </button>
        </header>
        <div className="df-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
