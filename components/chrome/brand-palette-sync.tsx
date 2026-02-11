"use client";

import { useEffect } from "react";
import docflowLogo from "@/app/public/docflow-logo.png";

const FALLBACK_COLORS = ["#14296b", "#1d57b8", "#25a7d5", "#25b9a1", "#f1c94d", "#d73967"];

function setRootColor(variable: string, value: string) {
  document.documentElement.style.setProperty(variable, value);
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) {
    return 0;
  }
  return (max - min) / max;
}

function extractPaletteFromImage(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;

  const context = canvas.getContext("2d");
  if (!context) {
    return FALLBACK_COLORS;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<string, number>();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 200) {
      continue;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (saturation(red, green, blue) < 0.16) {
      continue;
    }

    const key = rgbToHex(
      Math.round(red / 24) * 24,
      Math.round(green / 24) * 24,
      Math.round(blue / 24) * 24
    );
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const ranked = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex)
    .slice(0, 6);

  return ranked.length >= 4 ? ranked : FALLBACK_COLORS;
}

export function BrandPaletteSync() {
  useEffect(() => {
    const image = new Image();
    image.src = docflowLogo.src;

    image.onload = () => {
      const palette = extractPaletteFromImage(image);
      palette.forEach((color, index) => {
        setRootColor(`--brand-logo-${index + 1}`, color);
      });
    };

    image.onerror = () => {
      FALLBACK_COLORS.forEach((color, index) => {
        setRootColor(`--brand-logo-${index + 1}`, color);
      });
    };
  }, []);

  return null;
}
