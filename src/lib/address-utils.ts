/**
 * Builds a human-readable address string from structured address fields.
 * Skips the location_name (venue name) — that's shown separately.
 */
export function buildDisplayAddress(event: any): string {
  const parts: string[] = [];

  // Street + numbers
  if (event.address_street) {
    let street = event.address_street;
    if (event.address_ext_number) street += ` ${event.address_ext_number}`;
    if (event.address_int_number) street += `, Int ${event.address_int_number}`;
    parts.push(street);
  }

  if (event.address_neighborhood) parts.push(event.address_neighborhood);
  if (event.address_city) parts.push(event.address_city);
  if (event.address_state) parts.push(event.address_state);
  if (event.address_zip) parts.push(event.address_zip);
  if (event.address_country && event.address_country !== 'México') parts.push(event.address_country);

  return parts.join(', ');
}

/**
 * Builds a full address query string for Google Maps search.
 * Includes location_name for better results.
 */
export function buildGoogleMapsUrl(event: any): string | null {
  const parts: string[] = [];

  if (event.location_name) parts.push(event.location_name);
  if (event.address_street) {
    let street = event.address_street;
    if (event.address_ext_number) street += ` ${event.address_ext_number}`;
    parts.push(street);
  }
  if (event.address_neighborhood) parts.push(event.address_neighborhood);
  if (event.address_city) parts.push(event.address_city);
  if (event.address_state) parts.push(event.address_state);
  if (event.address_zip) parts.push(event.address_zip);
  if (event.address_country) parts.push(event.address_country);

  if (parts.length === 0) return null;

  const query = parts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
