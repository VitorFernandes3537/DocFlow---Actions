"use client";

import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type CollapsibleProps = {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
};

export function Collapsible({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  triggerClassName,
  contentClassName,
  disabled = false
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? (open as boolean) : internalOpen;

  const contentId = useMemo(
    () => `collapsible-content-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <div className={cn("df-collapsible", isOpen && "df-collapsible-open", className)}>
      <button
        type="button"
        className={cn("df-collapsible-trigger", triggerClassName)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
      >
        {trigger}
      </button>

      <div
        id={contentId}
        className={cn("df-collapsible-content-wrap", contentClassName)}
      >
        <div className="df-collapsible-content">{children}</div>
      </div>
    </div>
  );
}
