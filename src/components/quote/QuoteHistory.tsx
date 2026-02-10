import { useState } from 'react';
import { Quote } from '@/types/quote';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { openQuoteReminder } from '@/utils/outlookCalendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Download,
  Copy,
  Trash2,
  Eye,
  FileText,
  Calendar,
  CalendarPlus,
  User,
  Edit2,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuoteHistoryProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit?: (quote: Quote) => void;
}

export function QuoteHistory({
  quotes,
  onDelete,
  onDuplicate,
  onEdit,
}: QuoteHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const filteredQuotes = quotes.filter((quote) => {
    const search = searchTerm.toLowerCase();
    const quoteNumber = quote.id.slice(0, 8).toLowerCase();
    return (
      quote.client.name.toLowerCase().includes(search) ||
      quote.client.company?.toLowerCase().includes(search) ||
      formatDate(quote.createdAt).includes(search) ||
      quoteNumber.includes(search)
    );
  });

  const handleDownload = async (quote: Quote) => {
    await generateQuotePDF(quote);
    toast.success('PDF gerado com sucesso');
  };

  const handleDuplicate = (id: string) => {
    onDuplicate(id);
    toast.success('Orçamento duplicado');
  };

  const handleEdit = (quote: Quote) => {
    if (onEdit) {
      onEdit(quote);
      toast.info('Orçamento carregado para edição');
    }
  };

  const handleWhatsApp = (quote: Quote) => {
    if (!quote.client.phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const phone = quote.client.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const itemsSummary = quote.items
      .map((item, i) => `${i + 1}. ${item.productName} - ${item.modulation} (${item.quantity}x ${formatCurrency(item.price)})`)
      .join('\n');
    const message = `Olá ${quote.client.name || quote.client.company}!\n\nSegue o resumo do seu orçamento #${quote.id.slice(0, 8).toUpperCase()}:\n\n${itemsSummary}\n\n*Total: ${formatCurrency(quote.total)}*\n\nFicamos à disposição!`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAddToOutlook = (quote: Quote) => {
    if (!quote.payment.estimatedClosingDate) {
      toast.error('Este orçamento não tem data de fechamento definida');
      return;
    }
    const opened = openQuoteReminder(quote);
    if (opened) {
      toast.success('Abrindo Outlook para criar lembrete');
    } else {
      toast.error('Não foi possível criar o lembrete');
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      toast.success('Orçamento excluído');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Histórico de Orçamentos</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum orçamento salvo</p>
            <p className="text-sm">
              Os orçamentos gerados aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Nenhum orçamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        <FileText className="h-3 w-3" />
                        #{quote.id.slice(0, 8).toUpperCase()}
                      </span>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold truncate">
                        {quote.client.company || quote.client.name}
                      </span>
                      {quote.client.company && quote.client.name && (
                        <span className="text-sm text-muted-foreground truncate">
                          ({quote.client.name})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(quote.createdAt)}
                      </span>
                      <span>
                        {quote.items.length}{' '}
                        {quote.items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(quote.total)}
                      </div>
                      {quote.discount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Desc: {formatCurrency(quote.discount)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedQuote(quote)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quote)}
                          title="Editar orçamento"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(quote)}
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsApp(quote)}
                        title="Enviar por WhatsApp"
                        disabled={!quote.client.phone}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(quote.id)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddToOutlook(quote)}
                            disabled={!quote.payment.estimatedClosingDate}
                            title="Adicionar lembrete ao Outlook"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {quote.payment.estimatedClosingDate 
                            ? 'Adicionar lembrete ao Outlook'
                            : 'Sem data de fechamento definida'}
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(quote.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quote Details Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento</DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="font-semibold mb-2">Cliente</h4>
                <div className="text-sm space-y-1">
                  {selectedQuote.client.company && (
                    <p>
                      <strong>Empresa:</strong> {selectedQuote.client.company}
                    </p>
                  )}
                  {selectedQuote.client.name && (
                    <p>
                      <strong>Contato:</strong> {selectedQuote.client.name}
                    </p>
                  )}
                  {selectedQuote.client.phone && (
                    <p>
                      <strong>Telefone:</strong> {selectedQuote.client.phone}
                    </p>
                  )}
                  {selectedQuote.client.email && (
                    <p>
                      <strong>Email:</strong> {selectedQuote.client.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Itens</h4>
                <div className="space-y-2">
                  {selectedQuote.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-muted/50 p-3 rounded-lg text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {index + 1}. {item.productName}
                          </p>
                          <p className="text-muted-foreground">
                            {item.modulation}
                            {item.base && ` | ${item.base}`} | {item.fabricDescription} ({item.fabricTier})
                          </p>
                        </div>
                        <div className="text-right">
                          <p>
                            {item.quantity}x {formatCurrency(item.price)}
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive mb-2">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(selectedQuote.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    onClick={() => {
                      handleEdit(selectedQuote);
                      setSelectedQuote(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                <Button
                  onClick={() => handleDownload(selectedQuote)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
