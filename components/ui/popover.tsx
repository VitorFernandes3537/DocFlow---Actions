"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Popover({ trigger, children, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className={cn("df-popover", className)} ref={rootRef}>
      <button
        type="button"
        className="df-popover-trigger"
        onClick={() => setOpen((previous) => !previous)}
      >
        {trigger}
      </button>
      {open ? <div className="df-popover-content">{children}</div> : null}
    </div>
  );
}
