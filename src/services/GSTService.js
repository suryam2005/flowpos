import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTaxSettingsFromCache } from '../context/StoreSettingsContext';

class GSTService {
  constructor() {
    this.taxSettings = {
      enableGST: false, // Default to false - user must explicitly enable
      gstRate: 18,
      includeTaxInPrice: false,
    };
    this.initialized = false;
  }

  /**
   * Initialize GST service with settings from StoreSettingsContext
   * 
   * NOTE: AsyncStorage fallback removed as part of Task 12 cleanup
   * StoreSettingsContext is now the ONLY read path for tax settings
   */
  async initialize() {
    // Always refresh from cache to get latest settings
    this.refreshFromCache();
    this.initialized = true;
    console.log('✅ GSTService initialized with settings from StoreSettingsContext:', this.taxSettings);
  }

  /**
   * Update GST settings
   * 
   * NOTE: This method is kept for backward compatibility but should be called
   * through StoreSettingsContext.updateTaxSettings() for proper write-through behavior.
   * Direct AsyncStorage writes are deprecated.
   * 
   * @deprecated Use StoreSettingsContext.updateTaxSettings() instead
   */
  async updateSettings(newSettings) {
    try {
      this.taxSettings = { ...this.taxSettings, ...newSettings };
      // NOTE: AsyncStorage write kept for backward compatibility during transition
      // This should eventually be removed once all callers use StoreSettingsContext
      await AsyncStorage.setItem('taxSettings', JSON.stringify(this.taxSettings));
      console.log('✅ GST settings updated:', this.taxSettings);
      console.warn('⚠️ [GSTService] Direct updateSettings() is deprecated. Use StoreSettingsContext.updateTaxSettings() instead.');
    } catch (error) {
      console.error('❌ Error updating GST settings:', error);
    }
  }

  /**
   * Refresh settings from StoreSettingsContext cache
   * Call this when you need to ensure settings are up-to-date
   * This is now called automatically by initialize() and getSettings()
   */
  refreshFromCache() {
    try {
      const cachedTaxSettings = getTaxSettingsFromCache();
      if (cachedTaxSettings) {
        this.taxSettings = { ...this.taxSettings, ...cachedTaxSettings };
        console.log('✅ GSTService refreshed from StoreSettingsContext cache:', this.taxSettings);
      }
    } catch (error) {
      console.error('❌ Error refreshing GSTService from cache:', error);
    }
  }

  getSettings() {
    // Always refresh from cache to get latest settings
    this.refreshFromCache();
    return { ...this.taxSettings };
  }

  isGSTEnabled() {
    // Always refresh from cache to get latest settings
    this.refreshFromCache();
    return this.taxSettings.enableGST;
  }

  getGSTRate() {
    // Always refresh from cache to get latest settings
    this.refreshFromCache();
    return this.taxSettings.gstRate || 18;
  }

  isTaxIncludedInPrice() {
    // Always refresh from cache to get latest settings
    this.refreshFromCache();
    return this.taxSettings.includeTaxInPrice;
  }

  /**
   * Calculate GST amount from base price
   * @param {number} basePrice - Price without GST
   * @returns {number} GST amount
   */
  calculateGSTAmount(basePrice) {
    if (!this.isGSTEnabled()) return 0;
    
    const rate = this.getGSTRate();
    return (basePrice * rate) / 100;
  }

  /**
   * Calculate total price including GST
   * @param {number} basePrice - Price without GST
   * @returns {object} { basePrice, gstAmount, totalPrice }
   */
  calculateTotalWithGST(basePrice) {
    if (!this.isGSTEnabled()) {
      return {
        basePrice: basePrice,
        gstAmount: 0,
        totalPrice: basePrice,
        gstRate: 0
      };
    }

    const gstAmount = this.calculateGSTAmount(basePrice);
    const totalPrice = basePrice + gstAmount;

    return {
      basePrice: basePrice,
      gstAmount: gstAmount,
      totalPrice: totalPrice,
      gstRate: this.getGSTRate()
    };
  }

  /**
   * Calculate base price from total price (when tax is included)
   * @param {number} totalPrice - Price including GST
   * @returns {object} { basePrice, gstAmount, totalPrice }
   */
  calculateBaseFromTotal(totalPrice) {
    if (!this.isGSTEnabled()) {
      return {
        basePrice: totalPrice,
        gstAmount: 0,
        totalPrice: totalPrice,
        gstRate: 0
      };
    }

    const rate = this.getGSTRate();
    const basePrice = totalPrice / (1 + rate / 100);
    const gstAmount = totalPrice - basePrice;

    return {
      basePrice: basePrice,
      gstAmount: gstAmount,
      totalPrice: totalPrice,
      gstRate: rate
    };
  }

  /**
   * Calculate order totals with GST
   * @param {Array} items - Array of order items with price and quantity
   * @returns {object} Order totals breakdown
   */
  calculateOrderTotals(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        subtotal: 0,
        gstAmount: 0,
        grandTotal: 0,
        gstRate: this.getGSTRate(),
        gstEnabled: this.isGSTEnabled()
      };
    }

    let subtotal = 0;
    let totalGST = 0;

    items.forEach(item => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      
      if (this.isTaxIncludedInPrice()) {
        // Price includes GST - extract base price and GST
        const breakdown = this.calculateBaseFromTotal(itemTotal);
        subtotal += breakdown.basePrice;
        totalGST += breakdown.gstAmount;
      } else {
        // Price excludes GST - add GST on top
        subtotal += itemTotal;
        totalGST += this.calculateGSTAmount(itemTotal);
      }
    });

    const grandTotal = subtotal + totalGST;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(totalGST * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      gstRate: this.getGSTRate(),
      gstEnabled: this.isGSTEnabled(),
      taxIncludedInPrice: this.isTaxIncludedInPrice()
    };
  }

  /**
   * Format GST number for display
   * @param {string} gstNumber - Raw GST number
   * @returns {string} Formatted GST number
   */
  formatGSTNumber(gstNumber) {
    if (!gstNumber) return '';
    
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = gstNumber.replace(/[^0-9A-Z]/g, '').toUpperCase();
    
    // Format as: 22AAAAA0000A1Z5 -> 22-AAAAA-0000-A1Z5
    if (cleaned.length === 15) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}-${cleaned.slice(11, 15)}`;
    }
    
    return cleaned;
  }

  /**
   * Validate GST number format
   * @param {string} gstNumber - GST number to validate
   * @returns {object} { isValid, error }
   */
  validateGSTNumber(gstNumber) {
    if (!gstNumber || !gstNumber.trim()) {
      return { isValid: true, error: null }; // GST is optional
    }

    const cleaned = gstNumber.replace(/[^0-9A-Z]/g, '').toUpperCase();
    
    if (cleaned.length !== 15) {
      return { 
        isValid: false, 
        error: 'GST number must be exactly 15 characters long' 
      };
    }

    // Basic format validation: 15 alphanumeric characters
    // Real GST format is complex, but for POS system, we'll accept any 15 alphanumeric
    const gstRegex = /^[0-9A-Z]{15}$/;
    if (!gstRegex.test(cleaned)) {
      return { 
        isValid: false, 
        error: 'GST number must be 15 alphanumeric characters' 
      };
    }

    return { isValid: true, error: null };
  }

  /**
   * Get GST breakdown for display
   * @param {number} amount - Amount to calculate GST for
   * @returns {object} GST breakdown for display
   */
  getGSTBreakdown(amount) {
    if (!this.isGSTEnabled()) {
      return {
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalGST: 0,
        rate: 0
      };
    }

    const totalGST = this.calculateGSTAmount(amount);
    const rate = this.getGSTRate();
    
    // For simplicity, split GST equally between CGST and SGST
    // In real implementation, this would depend on inter-state vs intra-state
    const cgst = totalGST / 2;
    const sgst = totalGST / 2;
    const igst = 0; // Used for inter-state transactions

    return {
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      rate: rate
    };
  }
}

// Export singleton instance
const gstService = new GSTService();
export default gstService;