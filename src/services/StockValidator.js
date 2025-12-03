/**
 * StockValidator Service
 * 
 * Validates product quantities against available stock before adding to cart.
 * Ensures stock limits are enforced and provides user-friendly feedback.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

class StockValidator {
  /**
   * Validates if requested quantity is available
   * 
   * @param {Object} product - Product object with stock info
   * @param {number} requestedQuantity - Quantity user wants to add
   * @param {number} currentCartQuantity - Quantity already in cart for this product
   * @returns {Object} { isValid: boolean, availableStock: number, maxAddable: number, message: string }
   */
  validateQuantity(product, requestedQuantity, currentCartQuantity = 0) {
    // If stock tracking is disabled, allow any quantity
    if (!product.trackStock) {
      return {
        isValid: true,
        availableStock: Infinity,
        maxAddable: Infinity,
        message: 'Stock tracking disabled'
      };
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    const totalQuantity = currentCartQuantity + requestedQuantity;
    const maxAddable = Math.max(0, availableStock - currentCartQuantity);

    // Check if product is out of stock
    if (availableStock <= 0) {
      return {
        isValid: false,
        availableStock: 0,
        maxAddable: 0,
        message: `${product.name} is currently out of stock`
      };
    }

    // Check if requested quantity exceeds available stock
    if (totalQuantity > availableStock) {
      return {
        isValid: false,
        availableStock,
        maxAddable,
        message: `Cannot add ${requestedQuantity} items - Only ${maxAddable} available`
      };
    }

    // Valid quantity
    return {
      isValid: true,
      availableStock,
      maxAddable,
      message: 'Quantity available'
    };
  }

  /**
   * Gets maximum quantity that can be added to cart
   * 
   * @param {Object} product - Product object with stock info
   * @param {number} currentCartQuantity - Quantity already in cart for this product
   * @returns {number} Maximum addable quantity
   */
  getMaxAddableQuantity(product, currentCartQuantity = 0) {
    // If stock tracking is disabled, return a large number
    if (!product.trackStock) {
      return 999999;
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    const maxAddable = Math.max(0, availableStock - currentCartQuantity);
    
    return maxAddable;
  }

  /**
   * Checks if a product can be added to cart (at least 1 unit)
   * 
   * @param {Object} product - Product object with stock info
   * @param {number} currentCartQuantity - Quantity already in cart for this product
   * @returns {boolean} True if at least 1 unit can be added
   */
  canAddItem(product, currentCartQuantity = 0) {
    const validation = this.validateQuantity(product, 1, currentCartQuantity);
    return validation.isValid;
  }

  /**
   * Validates against current cart state
   * Checks if adding a product would exceed stock limits considering current cart
   * 
   * @param {Object} product - Product object with stock info
   * @param {Array} cartItems - Current cart items
   * @param {number} quantityToAdd - Quantity to add (default: 1)
   * @returns {Object} Validation result with cart context
   */
  validateAgainstCart(product, cartItems, quantityToAdd = 1) {
    // Find current quantity in cart
    const cartItem = cartItems.find(item => item.id === product.id);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;

    // Validate the quantity
    const validation = this.validateQuantity(product, quantityToAdd, currentCartQuantity);

    return {
      ...validation,
      currentCartQuantity,
      newCartQuantity: validation.isValid ? currentCartQuantity + quantityToAdd : currentCartQuantity
    };
  }

  /**
   * Checks if increment button should be disabled
   * 
   * @param {Object} product - Product object with stock info
   * @param {number} currentCartQuantity - Quantity already in cart for this product
   * @returns {boolean} True if increment should be disabled
   */
  shouldDisableIncrement(product, currentCartQuantity = 0) {
    if (!product.trackStock) {
      return false;
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    return currentCartQuantity >= availableStock;
  }

  /**
   * Validates manual quantity entry
   * 
   * @param {Object} product - Product object with stock info
   * @param {number} enteredQuantity - Quantity entered by user
   * @returns {Object} { isValid: boolean, adjustedQuantity: number, message: string }
   */
  validateManualEntry(product, enteredQuantity) {
    // Ensure quantity is a positive integer
    const quantity = Math.max(0, Math.floor(enteredQuantity));

    if (quantity === 0) {
      return {
        isValid: false,
        adjustedQuantity: 0,
        message: 'Quantity must be greater than 0'
      };
    }

    // If stock tracking is disabled, allow any positive quantity
    if (!product.trackStock) {
      return {
        isValid: true,
        adjustedQuantity: quantity,
        message: 'Quantity accepted'
      };
    }

    const availableStock = product.stock_quantity || product.stock || 0;

    // Check if entered quantity exceeds available stock
    if (quantity > availableStock) {
      return {
        isValid: false,
        adjustedQuantity: availableStock,
        message: `Maximum allowed quantity is ${availableStock}`
      };
    }

    return {
      isValid: true,
      adjustedQuantity: quantity,
      message: 'Quantity accepted'
    };
  }
}

// Create singleton instance
const stockValidator = new StockValidator();

export default stockValidator;
