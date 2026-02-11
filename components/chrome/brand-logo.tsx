"use client";

import { useState } from "react";
import { FileCheck2 } from "lucide-react";
import { cn } from "@/lib/cn";
import docflowLogo from "@/app/public/docflow-logo.png";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
};

export function BrandLogo({ className, showText = true }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("brand-logo", className)}>
      {!failed ? (
        <img
          src={docflowLogo.src}
          alt="DocFlow Actions"
          className="brand-logo-image"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="brand-logo-fallback">
          <FileCheck2 size={18} />
          {showText ? <strong>DocFlow Actions</strong> : null}
        </span>
      )}
    </div>
  );
}
