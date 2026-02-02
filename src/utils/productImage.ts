/**
 * Get the URL for a product image based on the product name.
 * Images should be placed in public/images/products/ with the product name as filename.
 * Supported formats: .jpg, .jpeg, .png, .webp
 */
export function getProductImageUrl(productName: string): string {
  const basePath = '/images/products/';
  // Normalize: uppercase, trim, replace special chars
  const normalizedName = productName
    .trim()
    .toUpperCase()
    .replace(/[\/\\:*?"<>|]/g, '_'); // Replace invalid filename chars
  return `${basePath}${normalizedName}.jpg`;
}

export function getProductImageFallback(): string {
  return '/placeholder.svg';
}

/**
 * Try to load an image and return true if it exists, false otherwise.
 * This is useful for checking if a product image exists before rendering.
 */
export async function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
