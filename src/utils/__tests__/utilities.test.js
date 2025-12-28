/**
 * Unit Tests for API Optimization Utilities
 * Feature: api-optimization
 * 
 * These tests validate the core functionality of the utility classes
 * created in tasks 1-4: APIDeduplicator, RetryController, NetworkGuard, CallCounter
 */

// Mock NetInfo before importing NetworkGuard
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true }))
}));

const { APIDeduplicator, ENDPOINT_KEYS, apiDeduplicator } = require('../APIDeduplicator');
const { RetryController, MaxRetriesError, calculateBackoffDelay, isRetryableMethod, retryController } = require('../RetryController');
const { NetworkGuard, OfflineError, networkGuard } = require('../NetworkGuard');
const { CallCounter, DEFAULT_THRESHOLDS, callCounter } = require('../CallCounter');
const NetInfo = require('@react-native-community/netinfo');

// Helper to create delayed promise
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('APIDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new APIDeduplicator();
  });

  describe('deduplicate()', () => {
    test('returns result from request function', async () => {
      const result = await deduplicator.deduplicate('test-key', async () => 'test-result');
      expect(result).toBe('test-result');
    });

    test('concurrent requests return same promise', async () => {
      let callCount = 0;
      const requestFn = async () => {
        callCount++;
        await delay(50);
        return 'result';
      };

      // Start multiple concurrent requests
      const promise1 = deduplicator.deduplicate('test-key', requestFn);
      const promise2 = deduplicator.deduplicate('test-key', requestFn);
      const promise3 = deduplicator.deduplicate('test-key', requestFn);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Only one actual call should be made
      expect(callCount).toBe(1);
      // All results should be identical
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(result3).toBe('result');
    });

    test('different keys make separate requests', async () => {
      let callCount = 0;
      const requestFn = async () => {
        callCount++;
        return 'result';
      };

      await Promise.all([
        deduplicator.deduplicate('key-1', requestFn),
        deduplicator.deduplicate('key-2', requestFn)
      ]);

      expect(callCount).toBe(2);
    });
  });

  describe('isInFlight()', () => {
    test('returns false when no request in flight', () => {
      expect(deduplicator.isInFlight('test-key')).toBe(false);
    });

    test('returns true when request is in flight', async () => {
      const requestFn = async () => {
        await delay(100);
        return 'result';
      };

      const promise = deduplicator.deduplicate('test-key', requestFn);
      expect(deduplicator.isInFlight('test-key')).toBe(true);
      
      await promise;
      expect(deduplicator.isInFlight('test-key')).toBe(false);
    });
  });

  describe('clear()', () => {
    test('clears specific endpoint', async () => {
      const requestFn = async () => {
        await delay(100);
        return 'result';
      };

      deduplicator.deduplicate('key-1', requestFn);
      deduplicator.deduplicate('key-2', requestFn);
      
      deduplicator.clear('key-1');
      
      expect(deduplicator.isInFlight('key-1')).toBe(false);
      expect(deduplicator.isInFlight('key-2')).toBe(true);
    });

    test('clears all endpoints when no key provided', async () => {
      const requestFn = async () => {
        await delay(100);
        return 'result';
      };

      deduplicator.deduplicate('key-1', requestFn);
      deduplicator.deduplicate('key-2', requestFn);
      
      deduplicator.clear();
      
      expect(deduplicator.isInFlight('key-1')).toBe(false);
      expect(deduplicator.isInFlight('key-2')).toBe(false);
    });
  });

  describe('ENDPOINT_KEYS', () => {
    test('contains expected endpoint keys', () => {
      expect(ENDPOINT_KEYS.PRODUCTS).toBe('GET:/api/products');
      expect(ENDPOINT_KEYS.ORDERS).toBe('GET:/api/orders');
      expect(ENDPOINT_KEYS.STORE).toBe('GET:/api/store');
      expect(ENDPOINT_KEYS.SUBSCRIPTION).toBe('GET:/api/subscription/status');
    });
  });

  describe('singleton instance', () => {
    test('apiDeduplicator is an instance of APIDeduplicator', () => {
      expect(apiDeduplicator).toBeInstanceOf(APIDeduplicator);
    });
  });
});


describe('RetryController', () => {
  let controller;

  beforeEach(() => {
    controller = new RetryController({
      baseDelayMs: 10, // Use short delays for testing
      maxDelayMs: 100
    });
  });

  describe('executeWithRetry()', () => {
    test('returns result on successful request', async () => {
      const result = await controller.executeWithRetry(async () => 'success');
      expect(result).toBe('success');
    });

    test('retries on failure and succeeds', async () => {
      let attempts = 0;
      const requestFn = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Network error');
          error.code = 'NETWORK_ERROR';
          throw error;
        }
        return 'success';
      };

      const result = await controller.executeWithRetry(requestFn);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    test('throws MaxRetriesError after max attempts', async () => {
      const requestFn = async () => {
        const error = new Error('Network error');
        error.code = 'NETWORK_ERROR';
        throw error;
      };

      await expect(controller.executeWithRetry(requestFn))
        .rejects.toThrow(MaxRetriesError);
    });

    test('does not retry write operations (POST)', async () => {
      let attempts = 0;
      const requestFn = async () => {
        attempts++;
        throw new Error('Server error');
      };

      await expect(controller.executeWithRetry(requestFn, { method: 'POST' }))
        .rejects.toThrow('Server error');
      expect(attempts).toBe(1);
    });

    test('does not retry write operations (PUT)', async () => {
      let attempts = 0;
      const requestFn = async () => {
        attempts++;
        throw new Error('Server error');
      };

      await expect(controller.executeWithRetry(requestFn, { method: 'PUT' }))
        .rejects.toThrow('Server error');
      expect(attempts).toBe(1);
    });

    test('does not retry write operations (DELETE)', async () => {
      let attempts = 0;
      const requestFn = async () => {
        attempts++;
        throw new Error('Server error');
      };

      await expect(controller.executeWithRetry(requestFn, { method: 'DELETE' }))
        .rejects.toThrow('Server error');
      expect(attempts).toBe(1);
    });
  });

  describe('calculateBackoffDelay()', () => {
    test('calculates exponential backoff correctly', () => {
      expect(calculateBackoffDelay(0, 1000, 10000)).toBe(1000);
      expect(calculateBackoffDelay(1, 1000, 10000)).toBe(2000);
      expect(calculateBackoffDelay(2, 1000, 10000)).toBe(4000);
      expect(calculateBackoffDelay(3, 1000, 10000)).toBe(8000);
    });

    test('caps delay at maxDelayMs', () => {
      expect(calculateBackoffDelay(10, 1000, 10000)).toBe(10000);
    });
  });

  describe('isRetryableMethod()', () => {
    test('GET is retryable', () => {
      expect(isRetryableMethod('GET')).toBe(true);
      expect(isRetryableMethod('get')).toBe(true);
    });

    test('POST is not retryable', () => {
      expect(isRetryableMethod('POST')).toBe(false);
      expect(isRetryableMethod('post')).toBe(false);
    });

    test('PUT is not retryable', () => {
      expect(isRetryableMethod('PUT')).toBe(false);
    });

    test('DELETE is not retryable', () => {
      expect(isRetryableMethod('DELETE')).toBe(false);
    });

    test('PATCH is not retryable', () => {
      expect(isRetryableMethod('PATCH')).toBe(false);
    });

    test('undefined method defaults to retryable', () => {
      expect(isRetryableMethod(undefined)).toBe(true);
      expect(isRetryableMethod(null)).toBe(true);
    });
  });

  describe('MaxRetriesError', () => {
    test('has correct properties', () => {
      const originalError = new Error('Original');
      const error = new MaxRetriesError(3, originalError);
      
      expect(error.name).toBe('MaxRetriesError');
      expect(error.code).toBe('MAX_RETRIES');
      expect(error.attempts).toBe(3);
      expect(error.originalError).toBe(originalError);
      expect(error.message).toBe('Request failed after 3 attempts');
    });
  });

  describe('singleton instance', () => {
    test('retryController is an instance of RetryController', () => {
      expect(retryController).toBeInstanceOf(RetryController);
    });
  });
});


describe('NetworkGuard', () => {
  let guard;

  beforeEach(() => {
    // Reset NetInfo mock
    NetInfo.fetch.mockClear();
    NetInfo.addEventListener.mockClear();
    NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    
    guard = new NetworkGuard();
  });

  afterEach(() => {
    guard.cleanup();
  });

  describe('isOnline()', () => {
    test('returns true when online', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      const result = await guard.isOnline(true);
      expect(result).toBe(true);
    });

    test('returns false when offline', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
      const result = await guard.isOnline(true);
      expect(result).toBe(false);
    });

    test('returns cached state when fresh=false', async () => {
      // Clear the fetch call from constructor
      NetInfo.fetch.mockClear();
      
      guard._isOnline = false;
      const result = await guard.isOnline(false);
      expect(result).toBe(false);
      // Should not make a new fetch call when fresh=false
      expect(NetInfo.fetch).not.toHaveBeenCalled();
    });
  });

  describe('isOnlineSync()', () => {
    test('returns cached online state', () => {
      guard._isOnline = true;
      expect(guard.isOnlineSync()).toBe(true);
      
      guard._isOnline = false;
      expect(guard.isOnlineSync()).toBe(false);
    });
  });

  describe('guardedApiCall()', () => {
    test('executes API call when online', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
      
      const result = await guard.guardedApiCall(async () => 'success');
      expect(result).toBe('success');
    });

    test('throws OfflineError when offline', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
      
      await expect(guard.guardedApiCall(async () => 'success'))
        .rejects.toThrow(OfflineError);
    });

    test('does not execute API call when offline', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
      
      let apiCalled = false;
      const apiCall = async () => {
        apiCalled = true;
        return 'success';
      };

      try {
        await guard.guardedApiCall(apiCall);
      } catch (e) {
        // Expected
      }

      expect(apiCalled).toBe(false);
    });
  });

  describe('OfflineError', () => {
    test('has correct properties', () => {
      const error = new OfflineError();
      
      expect(error.name).toBe('OfflineError');
      expect(error.code).toBe('OFFLINE');
      expect(error.message).toBe('Device is offline. Please check your connection.');
    });
  });

  describe('cleanup()', () => {
    test('unsubscribes from network listener', () => {
      const unsubscribe = jest.fn();
      NetInfo.addEventListener.mockReturnValue(unsubscribe);
      
      const testGuard = new NetworkGuard();
      testGuard.cleanup();
      
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    test('networkGuard is an instance of NetworkGuard', () => {
      expect(networkGuard).toBeInstanceOf(NetworkGuard);
    });
  });
});


describe('CallCounter', () => {
  let counter;

  beforeEach(() => {
    counter = new CallCounter();
    // Suppress console.warn for cleaner test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe('increment()', () => {
    test('increments count for endpoint', () => {
      counter.increment('GET:/api/products');
      expect(counter.getCount('GET:/api/products')).toBe(1);
      
      counter.increment('GET:/api/products');
      expect(counter.getCount('GET:/api/products')).toBe(2);
    });

    test('tracks different endpoints separately', () => {
      counter.increment('GET:/api/products');
      counter.increment('GET:/api/orders');
      counter.increment('GET:/api/products');
      
      expect(counter.getCount('GET:/api/products')).toBe(2);
      expect(counter.getCount('GET:/api/orders')).toBe(1);
    });
  });

  describe('getCount()', () => {
    test('returns 0 for unknown endpoint', () => {
      expect(counter.getCount('unknown')).toBe(0);
    });

    test('returns correct count for tracked endpoint', () => {
      counter.increment('test');
      counter.increment('test');
      counter.increment('test');
      expect(counter.getCount('test')).toBe(3);
    });
  });

  describe('getThreshold()', () => {
    test('returns default threshold for known endpoints', () => {
      expect(counter.getThreshold('GET:/api/products')).toBe(20);
      expect(counter.getThreshold('GET:/api/orders')).toBe(20);
      expect(counter.getThreshold('GET:/api/store')).toBe(10);
      expect(counter.getThreshold('GET:/api/subscription/status')).toBe(5);
    });

    test('returns Infinity for unknown endpoints', () => {
      expect(counter.getThreshold('unknown')).toBe(Infinity);
    });
  });

  describe('checkThreshold()', () => {
    test('returns false when under threshold', () => {
      counter.increment('GET:/api/subscription/status');
      expect(counter.checkThreshold('GET:/api/subscription/status')).toBe(false);
    });

    test('returns true when over threshold', () => {
      // Threshold for subscription is 5
      for (let i = 0; i < 6; i++) {
        counter.increment('GET:/api/subscription/status');
      }
      expect(counter.checkThreshold('GET:/api/subscription/status')).toBe(true);
    });

    test('logs warning when threshold exceeded', () => {
      for (let i = 0; i < 6; i++) {
        counter.increment('GET:/api/subscription/status');
      }
      counter.checkThreshold('GET:/api/subscription/status');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('API call threshold exceeded')
      );
    });

    test('logs warning only once per endpoint', () => {
      for (let i = 0; i < 10; i++) {
        counter.increment('GET:/api/subscription/status');
        counter.checkThreshold('GET:/api/subscription/status');
      }
      
      // Warning should only be logged once
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset()', () => {
    test('clears all counts', () => {
      counter.increment('GET:/api/products');
      counter.increment('GET:/api/orders');
      
      counter.reset();
      
      expect(counter.getCount('GET:/api/products')).toBe(0);
      expect(counter.getCount('GET:/api/orders')).toBe(0);
    });

    test('clears warning log tracking', () => {
      for (let i = 0; i < 6; i++) {
        counter.increment('GET:/api/subscription/status');
      }
      counter.checkThreshold('GET:/api/subscription/status');
      console.warn.mockClear();
      
      counter.reset();
      
      // After reset, warning should be logged again when threshold exceeded
      for (let i = 0; i < 6; i++) {
        counter.increment('GET:/api/subscription/status');
      }
      counter.checkThreshold('GET:/api/subscription/status');
      
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    test('updates session start time', () => {
      const originalStart = counter.getSessionStart();
      
      // Wait a bit to ensure time difference
      const waitPromise = new Promise(resolve => setTimeout(resolve, 10));
      return waitPromise.then(() => {
        counter.reset();
        expect(counter.getSessionStart()).toBeGreaterThan(originalStart);
      });
    });
  });

  describe('getAllCounts()', () => {
    test('returns object with all counts', () => {
      counter.increment('GET:/api/products');
      counter.increment('GET:/api/products');
      counter.increment('GET:/api/orders');
      
      const counts = counter.getAllCounts();
      
      expect(counts).toEqual({
        'GET:/api/products': 2,
        'GET:/api/orders': 1
      });
    });

    test('returns empty object when no counts', () => {
      expect(counter.getAllCounts()).toEqual({});
    });
  });

  describe('getSummary()', () => {
    test('returns summary with counts and thresholds', () => {
      counter.increment('GET:/api/products');
      counter.increment('GET:/api/products');
      
      const summary = counter.getSummary();
      
      const productsSummary = summary.find(s => s.endpoint === 'GET:/api/products');
      expect(productsSummary).toEqual({
        endpoint: 'GET:/api/products',
        count: 2,
        threshold: 20,
        exceeded: false
      });
    });

    test('marks exceeded endpoints correctly', () => {
      for (let i = 0; i < 6; i++) {
        counter.increment('GET:/api/subscription/status');
      }
      
      const summary = counter.getSummary();
      const subSummary = summary.find(s => s.endpoint === 'GET:/api/subscription/status');
      
      expect(subSummary.exceeded).toBe(true);
    });
  });

  describe('DEFAULT_THRESHOLDS', () => {
    test('contains expected thresholds', () => {
      expect(DEFAULT_THRESHOLDS['GET:/api/products']).toBe(20);
      expect(DEFAULT_THRESHOLDS['GET:/api/orders']).toBe(20);
      expect(DEFAULT_THRESHOLDS['GET:/api/store']).toBe(10);
      expect(DEFAULT_THRESHOLDS['GET:/api/subscription/status']).toBe(5);
    });
  });

  describe('singleton instance', () => {
    test('callCounter is an instance of CallCounter', () => {
      expect(callCounter).toBeInstanceOf(CallCounter);
    });
  });
});
