import { useState, useEffect } from 'react';
import { Quote } from '@/types/quote';

const STORAGE_KEY = 'quote-system-quotes';

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQuotes(JSON.parse(stored));
      } catch {
        setQuotes([]);
      }
    }
  }, []);

  const saveQuotes = (newQuotes: Quote[]) => {
    setQuotes(newQuotes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuotes));
  };

  const addQuote = (quote: Quote) => {
    const newQuotes = [quote, ...quotes];
    saveQuotes(newQuotes);
  };

  const deleteQuote = (id: string) => {
    const newQuotes = quotes.filter((q) => q.id !== id);
    saveQuotes(newQuotes);
  };

  const duplicateQuote = (id: string): Quote | null => {
    const quote = quotes.find((q) => q.id === id);
    if (!quote) return null;

    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    addQuote(newQuote);
    return newQuote;
  };

  return {
    quotes,
    addQuote,
    deleteQuote,
    duplicateQuote,
  };
}
