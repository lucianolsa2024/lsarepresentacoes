export interface AddressData {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}

/**
 * Formats an address object into a readable string
 */
export function formatAddress(address: AddressData): string {
  const parts: string[] = [];
  
  if (address.street) {
    let streetPart = address.street;
    if (address.number) {
      streetPart += `, ${address.number}`;
    }
    parts.push(streetPart);
  }
  
  if (address.neighborhood) {
    parts.push(address.neighborhood);
  }
  
  if (address.city) {
    let cityPart = address.city;
    if (address.state) {
      cityPart += ` - ${address.state}`;
    }
    parts.push(cityPart);
  }
  
  return parts.join(' - ');
}

/**
 * Generates a Google Maps search URL for a single address
 */
export function generateGoogleMapsUrl(address: AddressData): string {
  const addressString = formatAddress(address);
  if (!addressString) return '';
  
  const query = encodeURIComponent(addressString);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Generates a Google Maps directions URL with multiple waypoints
 * @param addresses Array of formatted address strings
 */
export function generateMultiPointRoute(addresses: string[]): string {
  if (addresses.length === 0) return '';
  if (addresses.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addresses[0])}`;
  }
  
  const waypoints = addresses.map(encodeURIComponent).join('/');
  return `https://www.google.com/maps/dir/${waypoints}`;
}

/**
 * Opens Google Maps in a new tab for a single address
 */
export function openInMaps(address: AddressData): void {
  const url = generateGoogleMapsUrl(address);
  if (url) {
    window.open(url, '_blank');
  }
}

/**
 * Opens Google Maps directions with multiple stops
 */
export function openMultiPointRoute(addresses: AddressData[]): void {
  const formattedAddresses = addresses
    .map(formatAddress)
    .filter(addr => addr.length > 0);
  
  const url = generateMultiPointRoute(formattedAddresses);
  if (url) {
    window.open(url, '_blank');
  }
}
