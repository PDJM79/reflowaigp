/**
 * Format a number as GBP currency
 * @param amount The amount to format
 * @param options Optional Intl.NumberFormat options
 * @returns Formatted currency string (e.g., "£1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    ...options,
  }).format(amount);
}

/**
 * Format a number as GBP currency without decimals
 * @param amount The amount to format
 * @returns Formatted currency string (e.g., "£1,235")
 */
export function formatCurrencyWhole(amount: number): string {
  return formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
