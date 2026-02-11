import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DocumentCardProps = {
  id: string;
  title: string;
  sourceType: string;
  baseDate: string | null;
};

export function DocumentCard({ id, title, sourceType, baseDate }: DocumentCardProps) {
  return (
    <Link href={`/document/${id}`} className="df-link-reset">
      <Card className="df-document-card">
        <div className="df-document-top">
          <CardTitle>{title}</CardTitle>
          <Badge tone="info">{sourceType.toUpperCase()}</Badge>
        </div>
        <CardSubtitle>Plano executável com evidências e rastreabilidade.</CardSubtitle>
        <div className="df-document-meta">
          <span>
            <FileText size={14} />
            Documento pronto para revisão
          </span>
          {baseDate ? (
            <span>
              <CalendarDays size={14} />
              Data base: {baseDate}
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
