import type { ReactNode } from "react";
import { BrandLogo } from "@/components/chrome/brand-logo";

type FloatingHeaderProps = {
  userName?: string;
  slotLeft?: ReactNode;
  slotRight?: ReactNode;
};

function getShortUserName(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "Usuario";
  }

  const first = normalized.split(/\s+/)[0] ?? normalized;
  return first.slice(0, 18);
}

export function FloatingHeader({ userName, slotLeft, slotRight }: FloatingHeaderProps) {
  const shortName = userName ? getShortUserName(userName) : null;

  return (
    <header className="df-floating-header">
      <div className="df-floating-inner">
        <div className="df-floating-brand">
          <BrandLogo />
          {shortName ? <span className="df-user-pill">Ola, {shortName}</span> : null}
        </div>
        <div className="df-floating-actions">
          {slotLeft}
          {slotRight}
        </div>
      </div>
    </header>
  );
}
