import { useState } from 'react';
import { getProductImageUrl, getProductImageFallback } from '@/utils/productImage';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  productName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

export function ProductImage({ productName, className, size = 'md' }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const imageUrl = hasError 
    ? getProductImageFallback() 
    : getProductImageUrl(productName);

  return (
    <img
      src={imageUrl}
      alt={productName}
      className={cn(
        sizeClasses[size],
        'object-cover rounded-md bg-muted',
        className
      )}
      onError={() => setHasError(true)}
    />
  );
}
