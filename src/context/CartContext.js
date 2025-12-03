import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import stockValidator from '../services/StockValidator';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.product.id);
      
      // Get current cart quantity for this product
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      
      // Validate stock before adding
      const validation = stockValidator.validateQuantity(
        action.payload.product,
        action.payload.quantityToAdd || 1,
        currentCartQuantity
      );
      
      // If validation fails, return current state with error
      if (!validation.isValid) {
        return {
          ...state,
          lastError: {
            type: 'STOCK_LIMIT_EXCEEDED',
            message: validation.message,
            productId: action.payload.product.id,
            productName: action.payload.product.name,
            availableStock: validation.availableStock,
            maxAddable: validation.maxAddable
          }
        };
      }
      
      // Clear any previous errors
      const newState = { ...state, lastError: null };
      
      // Add or update item
      if (existingItem) {
        return {
          ...newState,
          items: state.items.map(item =>
            item.id === action.payload.product.id
              ? { ...item, quantity: item.quantity + (action.payload.quantityToAdd || 1) }
              : item
          ),
        };
      }
      return {
        ...newState,
        items: [...state.items, { ...action.payload.product, quantity: action.payload.quantityToAdd || 1 }],
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        lastError: null
      };
    
    case 'UPDATE_QUANTITY':
      // Validate quantity update against stock limits
      const itemToUpdate = state.items.find(item => item.id === action.payload.id);
      
      if (itemToUpdate && itemToUpdate.trackStock) {
        const availableStock = itemToUpdate.stock_quantity || itemToUpdate.stock || 0;
        
        // If new quantity exceeds stock, cap it at available stock
        const validatedQuantity = Math.min(action.payload.quantity, availableStock);
        
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: validatedQuantity }
              : item
          ),
          lastError: validatedQuantity < action.payload.quantity ? {
            type: 'QUANTITY_ADJUSTED',
            message: `Quantity adjusted to ${validatedQuantity} (available stock)`,
            productId: action.payload.id
          } : null
        };
      }
      
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        lastError: null
      };
    
    case 'CLEAR_CART':
      return { ...state, items: [], lastError: null };
    
    case 'LOAD_CART':
      return { ...state, items: action.payload || [], lastError: null };
    
    case 'CLEAR_ERROR':
      return { ...state, lastError: null };
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], lastError: null });

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    saveCart();
  }, [state.items]);

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        dispatch({ type: 'LOAD_CART', payload: JSON.parse(cartData) });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addItem = (product, quantityToAdd = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantityToAdd } });
  };

  const removeItem = (productId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotal = () => {
    return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  };

  /**
   * Check if a product can be added to cart (at least 1 unit)
   * @param {string} productId - Product identifier
   * @param {Object} product - Product object with stock info
   * @returns {boolean} True if at least 1 unit can be added
   */
  const canAddItem = (productId, product) => {
    const cartItem = state.items.find(item => item.id === productId);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    return stockValidator.canAddItem(product, currentCartQuantity);
  };

  /**
   * Get remaining quantity that can be added to cart
   * @param {string} productId - Product identifier
   * @param {number} availableStock - Current available stock
   * @returns {number} Remaining addable quantity
   */
  const getRemainingQuantity = (productId, availableStock) => {
    const cartItem = state.items.find(item => item.id === productId);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    return Math.max(0, availableStock - currentCartQuantity);
  };

  /**
   * Clear the last error
   */
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <CartContext.Provider value={{
      items: state.items,
      lastError: state.lastError,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
      canAddItem,
      getRemainingQuantity,
      clearError,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};