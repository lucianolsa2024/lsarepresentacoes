import { useState } from 'react';
import { getProductImageUrl, getProductImageFallback } from '@/utils/productImage';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  productName: string;
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',   // era w-10 h-10 — aumentado
  md: 'w-20 h-20',   // era w-16 h-16
  lg: 'w-28 h-28',   // era w-24 h-24
};

export function ProductImage({ productName, imageUrl, className, size = 'md' }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [fallbackToLocal, setFallbackToLocal] = useState(false);

  const getImageSource = () => {
    if (hasError && fallbackToLocal) return getProductImageFallback();
    if (hasError && imageUrl) return getProductImageUrl(productName);
    if (imageUrl) return imageUrl;
    return getProductImageUrl(productName);
  };

  const handleError = () => {
    if (imageUrl && !hasError) {
      setHasError(true);
    } else if (!fallbackToLocal) {
      setFallbackToLocal(true);
    }
  };

  return (
    <img
      src={getImageSource()}
      alt={productName}
      className={cn(
        sizeClasses[size],
        'object-contain rounded-md bg-muted p-1', // object-contain + padding interno
        className
      )}
      onError={handleError}
    />
  );
}
