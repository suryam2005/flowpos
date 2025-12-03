/**
 * CartContext Integration Tests
 * 
 * Tests the integration of StockValidator with CartContext
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { CartProvider, useCart } from '../CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Wrapper component for testing
const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

describe('CartContext with Stock Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stock Limit Enforcement', () => {
    test('should prevent adding items when stock limit is reached', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '1',
        name: 'Test Product',
        price: 10,
        trackStock: true,
        stock_quantity: 5
      };

      // Add 5 items (up to stock limit)
      act(() => {
        result.current.addItem(product, 5);
      });

      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.lastError).toBeNull();

      // Try to add 1 more (should fail)
      act(() => {
        result.current.addItem(product, 1);
      });

      // Quantity should remain at 5
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.lastError).not.toBeNull();
      expect(result.current.lastError.type).toBe('STOCK_LIMIT_EXCEEDED');
    });

    test('should allow adding items when stock tracking is disabled', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '2',
        name: 'No Track Product',
        price: 20,
        trackStock: false,
        stock_quantity: 5
      };

      // Add 10 items (more than stock, but tracking disabled)
      act(() => {
        result.current.addItem(product, 10);
      });

      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.lastError).toBeNull();
    });

    test('should reject adding items when product is out of stock', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '3',
        name: 'Out of Stock Product',
        price: 15,
        trackStock: true,
        stock_quantity: 0
      };

      act(() => {
        result.current.addItem(product, 1);
      });

      expect(result.current.items.length).toBe(0);
      expect(result.current.lastError).not.toBeNull();
      expect(result.current.lastError.message).toContain('out of stock');
    });
  });

  describe('canAddItem method', () => {
    test('should return true when stock is available', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '4',
        name: 'Available Product',
        price: 25,
        trackStock: true,
        stock_quantity: 10
      };

      // Add 5 items
      act(() => {
        result.current.addItem(product, 5);
      });

      // Should be able to add more
      const canAdd = result.current.canAddItem('4', product);
      expect(canAdd).toBe(true);
    });

    test('should return false when stock limit is reached', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '5',
        name: 'Limited Product',
        price: 30,
        trackStock: true,
        stock_quantity: 3
      };

      // Add all available stock
      act(() => {
        result.current.addItem(product, 3);
      });

      // Should not be able to add more
      const canAdd = result.current.canAddItem('5', product);
      expect(canAdd).toBe(false);
    });
  });

  describe('getRemainingQuantity method', () => {
    test('should return correct remaining quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '6',
        name: 'Test Product',
        price: 40,
        trackStock: true,
        stock_quantity: 10
      };

      // Add 3 items
      act(() => {
        result.current.addItem(product, 3);
      });

      // Should have 7 remaining
      const remaining = result.current.getRemainingQuantity('6', 10);
      expect(remaining).toBe(7);
    });

    test('should return 0 when stock limit is reached', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '7',
        name: 'Test Product',
        price: 50,
        trackStock: true,
        stock_quantity: 5
      };

      // Add all stock
      act(() => {
        result.current.addItem(product, 5);
      });

      // Should have 0 remaining
      const remaining = result.current.getRemainingQuantity('7', 5);
      expect(remaining).toBe(0);
    });
  });

  describe('UPDATE_QUANTITY with stock validation', () => {
    test('should cap quantity at available stock', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '8',
        name: 'Test Product',
        price: 60,
        trackStock: true,
        stock_quantity: 10
      };

      // Add 5 items
      act(() => {
        result.current.addItem(product, 5);
      });

      // Try to update to 15 (exceeds stock)
      act(() => {
        result.current.updateQuantity('8', 15);
      });

      // Should be capped at 10
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.lastError).not.toBeNull();
      expect(result.current.lastError.type).toBe('QUANTITY_ADJUSTED');
    });

    test('should allow quantity update within stock limits', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '9',
        name: 'Test Product',
        price: 70,
        trackStock: true,
        stock_quantity: 10
      };

      // Add 5 items
      act(() => {
        result.current.addItem(product, 5);
      });

      // Update to 8 (within stock)
      act(() => {
        result.current.updateQuantity('9', 8);
      });

      // Should update successfully
      expect(result.current.items[0].quantity).toBe(8);
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('Error handling', () => {
    test('should clear error when clearError is called', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '10',
        name: 'Test Product',
        price: 80,
        trackStock: true,
        stock_quantity: 0
      };

      // Trigger error
      act(() => {
        result.current.addItem(product, 1);
      });

      expect(result.current.lastError).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });

    test('should clear error when removing item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = {
        id: '11',
        name: 'Test Product',
        price: 90,
        trackStock: true,
        stock_quantity: 5
      };

      // Add items and trigger error
      act(() => {
        result.current.addItem(product, 5);
        result.current.addItem(product, 1); // This will fail
      });

      expect(result.current.lastError).not.toBeNull();

      // Remove item
      act(() => {
        result.current.removeItem('11');
      });

      expect(result.current.lastError).toBeNull();
    });
  });
});
