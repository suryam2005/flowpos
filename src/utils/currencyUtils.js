/**
 * Currency utility functions
 * Derives currency symbol from currency code
 */

// Currency mapping
const CURRENCY_MAP = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Get currency symbol from currency code
 * @param {string} currencyCode - Currency code (e.g., 'INR', 'USD')
 * @returns {string} Currency symbol (e.g., '₹', '$')
 */
export const getCurrencySymbol = (currencyCode) => {
  return CURRENCY_MAP[currencyCode] || '₹'; // Default to INR
};

/**
 * Get all supported currencies
 * @returns {Array} Array of currency objects with code, symbol, and name
 */
export const getSupportedCurrencies = () => [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default {
  getCurrencySymbol,
  getSupportedCurrencies,
};
