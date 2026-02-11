import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileCheck2,
  FileSignature,
  FileText,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  NotebookText,
  ShieldCheck
} from "lucide-react";

type ItemType = "task" | "deadline" | "required_doc" | "warning";
export type RequiredDocIconKey =
  | "id_card"
  | "house"
  | "heart_pulse"
  | "graduation_cap"
  | "camera"
  | "credit_card"
  | "shield_check"
  | "file_signature"
  | "badge_check"
  | "notebook_text"
  | "file_check"
  | "file_text";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getItemIcon(type: ItemType) {
  switch (type) {
    case "task":
      return CheckCircle2;
    case "deadline":
      return CalendarClock;
    case "required_doc":
      return FileText;
    case "warning":
      return AlertTriangle;
    default:
      return CircleHelp;
  }
}

export function getItemLabel(type: ItemType) {
  switch (type) {
    case "task":
      return "Tarefa";
    case "deadline":
      return "Prazo";
    case "required_doc":
      return "Documento";
    case "warning":
      return "Atencao";
    default:
      return "Item";
  }
}

type DocumentIconRule = {
  iconKey: RequiredDocIconKey;
  keywords: string[];
};

const REQUIRED_DOC_ICON_META: Record<RequiredDocIconKey, { icon: LucideIcon; label: string }> = {
  id_card: {
    icon: IdCard,
    label: "Identificacao"
  },
  house: {
    icon: House,
    label: "Comprovante de endereco"
  },
  heart_pulse: {
    icon: HeartPulse,
    label: "Saude"
  },
  graduation_cap: {
    icon: GraduationCap,
    label: "Escolaridade"
  },
  camera: {
    icon: Camera,
    label: "Foto"
  },
  credit_card: {
    icon: CreditCard,
    label: "Pagamento"
  },
  shield_check: {
    icon: ShieldCheck,
    label: "Regularidade"
  },
  file_signature: {
    icon: FileSignature,
    label: "Declaracao"
  },
  badge_check: {
    icon: BadgeCheck,
    label: "Certidao"
  },
  notebook_text: {
    icon: NotebookText,
    label: "Formulario"
  },
  file_check: {
    icon: FileCheck2,
    label: "Documento complementar"
  },
  file_text: {
    icon: FileText,
    label: "Documento"
  }
};

const DOCUMENT_ICON_RULES: DocumentIconRule[] = [
  {
    iconKey: "id_card",
    keywords: ["rg", "cpf", "identidade", "identificacao", "documento oficial"]
  },
  {
    iconKey: "house",
    keywords: ["residencia", "endereco", "cep", "domicilio", "moradia"]
  },
  {
    iconKey: "heart_pulse",
    keywords: ["atestado medico", "laudo medico", "saude", "exame medico"]
  },
  {
    iconKey: "graduation_cap",
    keywords: ["escolaridade", "historico", "ensino", "diploma", "certificado escolar"]
  },
  {
    iconKey: "camera",
    keywords: ["foto", "fotografia", "3x4"]
  },
  {
    iconKey: "credit_card",
    keywords: ["taxa", "pagamento", "boleto", "quitacao", "guia", "gr"]
  },
  {
    iconKey: "shield_check",
    keywords: ["antecedente", "negativa", "militar", "eleitoral", "regularidade"]
  },
  {
    iconKey: "file_signature",
    keywords: ["declaracao", "assinatura", "termo", "autorizacao"]
  },
  {
    iconKey: "badge_check",
    keywords: ["certidao", "certificado"]
  },
  {
    iconKey: "notebook_text",
    keywords: ["formulario", "questionario", "ficha", "inscricao"]
  },
  {
    iconKey: "file_check",
    keywords: ["comprovante", "anexo", "item", "doc"]
  }
];

export function getRequiredDocIconByKey(iconKey: RequiredDocIconKey) {
  return REQUIRED_DOC_ICON_META[iconKey] ?? REQUIRED_DOC_ICON_META.file_text;
}

export function getRequiredDocIconKey(title: string, description: string): RequiredDocIconKey {
  const text = normalize(`${title} ${description}`);
  const match = DOCUMENT_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );

  return match?.iconKey ?? "file_text";
}

export function getRequiredDocIcon(title: string, description: string) {
  const iconKey = getRequiredDocIconKey(title, description);
  return getRequiredDocIconByKey(iconKey);
}
