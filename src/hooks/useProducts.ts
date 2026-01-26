import { useState, useEffect } from 'react';
import { Product } from '@/types/quote';
import { DEFAULT_PRODUCTS } from '@/data/products';

const STORAGE_KEY = 'quote-system-products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch {
        setProducts(DEFAULT_PRODUCTS);
      }
    } else {
      setProducts(DEFAULT_PRODUCTS);
    }
  }, []);

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts));
  };

  const addProduct = (product: Product) => {
    const newProducts = [...products, product];
    saveProducts(newProducts);
  };

  const updateProduct = (id: string, product: Product) => {
    const newProducts = products.map((p) => (p.id === id ? product : p));
    saveProducts(newProducts);
  };

  const deleteProduct = (id: string) => {
    const newProducts = products.filter((p) => p.id !== id);
    saveProducts(newProducts);
  };

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
