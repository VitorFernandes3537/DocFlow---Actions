"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

export function Tooltip({
  content,
  children,
  side = "top",
  className
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

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
    <span
      ref={rootRef}
      className={cn("df-tooltip-root", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        className="df-tooltip-trigger"
        onClick={() => setOpen((previous) => !previous)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((previous) => !previous);
          }
        }}
      >
        {children}
      </span>
      <span
        className={cn(
          "df-tooltip-content",
          `df-tooltip-${side}`,
          open && "df-tooltip-open"
        )}
      >
        {content}
      </span>
    </span>
  );
}
