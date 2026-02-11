"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type HeaderBackButtonProps = {
  fallbackHref?: string;
  label?: string;
};

export function HeaderBackButton({
  fallbackHref = "/dashboard",
  label = "Voltar"
}: HeaderBackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={handleClick} className="df-button df-button-secondary df-button-md">
      <ArrowLeft size={14} />
      {label}
    </button>
  );
}
