import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface AddressFromCep {
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);

  const lookupCep = useCallback(async (cep: string): Promise<AddressFromCep | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await res.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return null;
      }

      toast.success('Endereço preenchido automaticamente');
      return {
        street: data.logradouro || '',
        complement: data.complemento || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        zipCode: cep,
      };
    } catch {
      toast.error('Erro ao buscar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookupCep, loading };
}
