import { useState } from 'react';
import { getProductImageUrl, getProductImageFallback } from '@/utils/productImage';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  productName: string;
  imageUrl?: string | null; // Storage URL takes priority
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

export function ProductImage({ productName, imageUrl, className, size = 'md' }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [fallbackToLocal, setFallbackToLocal] = useState(false);
  
  // Priority: 1. Storage URL, 2. Local file, 3. Placeholder
  const getImageSource = () => {
    if (hasError && fallbackToLocal) {
      return getProductImageFallback();
    }
    if (hasError && imageUrl) {
      // Storage image failed, try local
      return getProductImageUrl(productName);
    }
    if (imageUrl) {
      return imageUrl;
    }
    return getProductImageUrl(productName);
  };

  const handleError = () => {
    if (imageUrl && !hasError) {
      // First error: storage URL failed, try local
      setHasError(true);
    } else if (!fallbackToLocal) {
      // Second error: local also failed, use placeholder
      setFallbackToLocal(true);
    }
  };

  return (
    <img
      src={getImageSource()}
      alt={productName}
      className={cn(
        sizeClasses[size],
        'object-cover rounded-md bg-muted',
        className
      )}
      onError={handleError}
    />
  );
}
