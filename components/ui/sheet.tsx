"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
};

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  side = "right"
}: SheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="df-sheet-root" role="dialog" aria-modal>
      <button
        type="button"
        className="df-sheet-backdrop"
        aria-label="Fechar"
        onClick={() => onOpenChange(false)}
      />
      <aside className={cn("df-sheet-content", `df-sheet-${side}`)}>
        <div className="df-sheet-header">
          <strong>{title}</strong>
          <button
            type="button"
            className="df-sheet-close"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div className="df-sheet-body">{children}</div>
      </aside>
    </div>
  );
}
