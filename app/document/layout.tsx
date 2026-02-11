import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DocFlow Actions - Documentos",
  description: "Visualizacao e execucao documental"
};

export default function DocumentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
