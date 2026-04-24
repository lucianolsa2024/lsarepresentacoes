import { PriceConsultation } from '@/components/PriceConsultation';
import { useProducts } from '@/hooks/useProducts';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

function PriceConsultationContent() {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando produtos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6">
      <PriceConsultation products={products} />
    </div>
  );
}

export default function PriceConsultationPage() {
  return (
    <ProtectedRoute>
      <PriceConsultationContent />
    </ProtectedRoute>
  );
}
