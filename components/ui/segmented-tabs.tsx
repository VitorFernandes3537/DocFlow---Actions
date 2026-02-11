"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SegmentedOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsProps = {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedTabs({
  value,
  options,
  onChange,
  className
}: SegmentedTabsProps) {
  return (
    <div className={cn("df-segmented-tabs", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "df-segmented-item",
            value === option.value && "df-segmented-item-active"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
