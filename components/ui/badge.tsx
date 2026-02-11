import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "default" | "ok" | "warn" | "uncertain" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return <span className={cn("df-badge", `df-badge-${tone}`, className)} {...props} />;
}
