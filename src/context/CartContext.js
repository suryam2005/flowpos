import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const CartContext = createContext();

// Inactivity timeout in milliseconds (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          lastActivity: Date.now(),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        lastActivity: Date.now(),
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        lastActivity: Date.now(),
      };
    
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        lastActivity: Date.now(),
      };
    
    case 'CLEAR_CART':
      return { ...state, items: [], lastActivity: Date.now() };
    
    case 'LOAD_CART':
      return { ...state, items: action.payload || [], lastActivity: Date.now() };
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], lastActivity: Date.now() });
  const inactivityTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastActivityRef = useRef(Date.now());
  const hasItemsRef = useRef(false);
  const isMountedRef = useRef(true);  // Track mount status to prevent memory leaks

  useEffect(() => {
    isMountedRef.current = true;
    loadCart();
    
    return () => {
      isMountedRef.current = false;
      // Clean up timer on unmount
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    saveCart();
    hasItemsRef.current = state.items.length > 0;
    lastActivityRef.current = state.lastActivity;
  }, [state.items, state.lastActivity]);

  // Simple timer start function with memory leak protection
  const startTimer = useCallback(() => {
    // Always clear existing timer first
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Only start new timer if mounted and has items
    if (isMountedRef.current && hasItemsRef.current) {
      inactivityTimerRef.current = setTimeout(() => {
        // Double-check still mounted before dispatching
        if (isMountedRef.current) {
          console.log('🕐 [Cart] Inactivity timeout - clearing cart');
          dispatch({ type: 'CLEAR_CART' });
        }
      }, INACTIVITY_TIMEOUT);
    }
  }, []);

  // Start timer when lastActivity changes
  useEffect(() => {
    if (state.items.length > 0) {
      startTimer();
    } else if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastActivity]);

  // Handle app state changes with memory leak protection
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Check if component is still mounted before processing
      if (!isMountedRef.current) return;
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && hasItemsRef.current) {
          console.log('🕐 [Cart] App resumed after inactivity - clearing cart');
          dispatch({ type: 'CLEAR_CART' });
        } else if (hasItemsRef.current) {
          startTimer();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [startTimer]);

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      const lastActivityData = await AsyncStorage.getItem('cartLastActivity');
      
      if (cartData) {
        const items = JSON.parse(cartData);
        const lastActivity = lastActivityData ? parseInt(lastActivityData) : Date.now();
        const timeSinceLastActivity = Date.now() - lastActivity;
        
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && items.length > 0) {
          console.log('🕐 [Cart] Cart expired on load - clearing');
          dispatch({ type: 'CLEAR_CART' });
        } else {
          dispatch({ type: 'LOAD_CART', payload: items });
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(state.items));
      await AsyncStorage.setItem('cartLastActivity', state.lastActivity.toString());
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addItem = (product) => {
    const cartItem = state.items.find(item => item.id === product.id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const isTrackingEnabled = product.track_stock !== false;
    
    if (isTrackingEnabled) {
      if (currentQuantity >= product.stock) {
        return false;
      }
    } else {
      if (currentQuantity >= 50) {
        return false;
      }
    }
    
    dispatch({ type: 'ADD_ITEM', payload: product });
    return true;
  };

  const removeItem = (productId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId, quantity, maxStock = null) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else if (maxStock && quantity > maxStock) {
      return false;
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
      return true;
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

  return (
    <CartContext.Provider value={{
      items: state.items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
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
