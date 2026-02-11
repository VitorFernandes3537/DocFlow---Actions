"use client";

import { useMemo, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { FileText, IdCard, Receipt, ShieldCheck } from "lucide-react";
import {
  getRequiredDocIconByKey,
  type RequiredDocIconKey
} from "@/components/ui/icon-map";

export type RequiredDocColor = "slate" | "amber" | "cyan" | "zinc" | "emerald" | "rose";

export type RequiredDocsTimelineItem = {
  id: string;
  title: string;
  description?: string;
  color?: RequiredDocColor | `#${string}`;
  icon: LucideIcon | RequiredDocIconKey;
};

type RequiredDocsTimelineProps = {
  items: RequiredDocsTimelineItem[];
  className?: string;
  hint?: string;
  colorOffset?: number;
  colorSpan?: number;
};

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function normalizeDescription(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

const LOGO_COLOR_STOPS = [
  "#2f4fa9",
  "#2cbcd7",
  "#33b889",
  "#f4c43d",
  "#f0892b",
  "#de597e",
  "#8c5bd8"
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "").trim();
  const source =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  const safe = source.padEnd(6, "0").slice(0, 6);

  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
  }

  return {
    h: (h * 60 + 360) % 360,
    s: s * 100,
    l: l * 100
  };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255
  };
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function interpolateHue(from: number, to: number, t: number) {
  let delta = ((to - from + 540) % 360) - 180;
  if (Math.abs(delta) > 150) {
    delta = ((to - from + 720) % 360) - 360;
  }
  return (from + delta * t + 360) % 360;
}

function interpolateHexColor(fromHex: string, toHex: string, t: number) {
  const from = rgbToHsl(hexToRgb(fromHex));
  const to = rgbToHsl(hexToRgb(toHex));

  const mixed: Hsl = {
    h: interpolateHue(from.h, to.h, t),
    s: lerp(from.s, to.s, t),
    l: lerp(from.l, to.l, t)
  };

  return rgbToHex(hslToRgb(mixed));
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(alpha, 0, 1)})`;
}

function getDynamicColor(index: number, total: number) {
  if (total <= 1) {
    return LOGO_COLOR_STOPS[0];
  }

  const safeTotal = Math.max(2, total);
  const safeIndex = clamp(index, 0, safeTotal - 1);
  const progress = safeIndex / (safeTotal - 1);
  const segments = LOGO_COLOR_STOPS.length - 1;
  const scaled = progress * segments;
  const segmentIndex = Math.min(segments - 1, Math.floor(scaled));
  const localT = scaled - segmentIndex;

  return interpolateHexColor(LOGO_COLOR_STOPS[segmentIndex], LOGO_COLOR_STOPS[segmentIndex + 1], localT);
}

export const demoItems: RequiredDocsTimelineItem[] = [
  {
    id: "doc-demo-01",
    title: "Documento oficial com foto",
    description: "RG ou CNH validos e legiveis para identificacao do candidato.",
    color: "slate",
    icon: IdCard
  },
  {
    id: "doc-demo-02",
    title: "CPF regularizado",
    description: "CPF ativo, podendo constar no documento de identificacao.",
    color: "amber",
    icon: FileText
  },
  {
    id: "doc-demo-03",
    title: "Comprovante de residencia",
    description: "Comprovante recente conforme prazo definido no edital.",
    color: "cyan",
    icon: Receipt
  },
  {
    id: "doc-demo-04",
    title: "Certidao ou declaracao",
    description: "Documento complementar exigido para validacao final da inscricao.",
    color: "zinc",
    icon: ShieldCheck
  }
];

export default function RequiredDocsTimeline({
  items,
  className,
  hint = "Arraste para o lado para visualizar todos os documentos exigidos.",
  colorOffset = 0,
  colorSpan
}: RequiredDocsTimelineProps) {
  const data = items.length > 0 ? items : demoItems;
  const dynamicColors = useMemo(() => {
    const span = Math.max(2, colorSpan ?? data.length);
    return data.map((_, index) => getDynamicColor(colorOffset + index, span));
  }, [colorOffset, colorSpan, data]);

  return (
    <section className={cx("rdt-root", className)}>
      <div className="rdt-scroll">
        <div className="rdt-track" role="list" aria-label="Timeline de documentos exigidos">
          {data.map((item, index) => {
            const Icon = typeof item.icon === "string" ? getRequiredDocIconByKey(item.icon).icon : item.icon;
            const color = item.color && item.color.startsWith("#") ? item.color : dynamicColors[index];
            const style = {
              "--rdt-color": color,
              "--rdt-color-soft": hexToRgba(color, 0.17)
            } as CSSProperties;

            return (
              <article
                key={item.id}
                role="listitem"
                className="rdt-item"
                style={style}
              >
                <div className="rdt-pill">
                  <div className="rdt-icon-bubble">
                    <Icon size={40} aria-hidden />
                  </div>

                  <div className="rdt-pill-copy">
                    <div className="rdt-pill-header">
                      <span className="rdt-title-dot" aria-hidden />
                      <p className="rdt-pill-title">{item.title}</p>
                    </div>
                    {normalizeDescription(item.description) ? (
                      <p className="rdt-pill-description">{normalizeDescription(item.description)}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <p className="rdt-hint">{hint}</p>
    </section>
  );
}
