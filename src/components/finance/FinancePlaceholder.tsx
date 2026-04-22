import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FinancePlaceholder({ icon: Icon, title, description }: Props) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground">Módulo em construção — em breve disponível.</p>
      </CardContent>
    </Card>
  );
}
