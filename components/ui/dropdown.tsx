import type { HTMLAttributes, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type DropdownProps = HTMLAttributes<HTMLDetailsElement> & {
  label: ReactNode;
  children: ReactNode;
};

export function Dropdown({ label, children, className, ...props }: DropdownProps) {
  return (
    <details className={cn("df-dropdown", className)} {...props}>
      <summary className="df-dropdown-trigger">
        <span>{label}</span>
        <ChevronDown size={16} />
      </summary>
      <div className="df-dropdown-content">{children}</div>
    </details>
  );
}
