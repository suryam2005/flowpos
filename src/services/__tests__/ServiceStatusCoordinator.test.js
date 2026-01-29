/**
 * ServiceStatusCoordinator Tests
 * 
 * Tests for Phase D Service Status Optimization
 * Requirements: 7.1, 7.2, 7.3
 */

import serviceStatusCoordinator from '../ServiceStatusCoordinator';
import serviceStatusCache from '../ServiceStatusCache';

// Mock the API config
jest.mock('../../config/apiConfig', () => ({
  apiCallWithFallback: jest.fn()
}));

import { apiCallWithFallback } from '../../config/apiConfig';

describe('ServiceStatusCoordinator', () => {
  beforeEach(() => {
    // Clear cache and reset mocks before each test
    serviceStatusCache.clear();
    jest.clearAllMocks();
  });

  describe('WhatsApp Status Fetching', () => {
    test('should fetch from API when no cache exists', async () => {
      const mockStatus = {
        configured: true,
        ready: true,
        fromNumber: '+1234567890'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockStatus })
      };

      apiCallWithFallback.mockResolvedValue(mockResponse);

      const result = await serviceStatusCoordinator.fetchWhatsAppStatus({
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledWith('/whatsapp/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      expect(result).toEqual(mockStatus);
      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual(mockStatus);
    });

    test('should use cached status when available and not force refresh', async () => {
      const cachedStatus = {
        configured: true,
        ready: false,
        fromNumber: '+0987654321'
      };

      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', cachedStatus);

      const result = await serviceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh: false,
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).not.toHaveBeenCalled();
      expect(result).toEqual(cachedStatus);
    });

    test('should bypass cache when force refresh is true', async () => {
      const cachedStatus = { configured: true, ready: false };
      const freshStatus = { configured: true, ready: true };

      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', cachedStatus);

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: freshStatus })
      };

      apiCallWithFallback.mockResolvedValue(mockResponse);

      const result = await serviceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh: true,
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalled();
      expect(result).toEqual(freshStatus);
      expect(serviceStatusCache.getServiceStatus('whatsapp')).toEqual(freshStatus);
    });

    test('should return cached status if API fails and cache exists', async () => {
      const cachedStatus = { configured: true, ready: false };

      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', cachedStatus);

      // Mock API failure
      apiCallWithFallback.mockRejectedValue(new Error('Network error'));

      const result = await serviceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh: true,
        screenName: 'TestScreen'
      });

      expect(result).toEqual(cachedStatus);
    });

    test('should throw error if API fails and no cache exists', async () => {
      // Mock API failure
      apiCallWithFallback.mockRejectedValue(new Error('Network error'));

      await expect(
        serviceStatusCoordinator.fetchWhatsAppStatus({
          screenName: 'TestScreen'
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Email Status Fetching', () => {
    test('should fetch email status from API when no cache exists', async () => {
      const mockStatus = {
        initialized: true,
        emailAutomationEnabled: true,
        scheduledJobs: []
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockStatus })
      };

      apiCallWithFallback.mockResolvedValue(mockResponse);

      const result = await serviceStatusCoordinator.fetchEmailStatus({
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledWith('/email-automation/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      expect(result).toEqual(mockStatus);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(true);
      expect(serviceStatusCache.getServiceStatus('email')).toEqual(mockStatus);
    });

    test('should use cached email status when available', async () => {
      const cachedStatus = {
        initialized: false,
        emailAutomationEnabled: false
      };

      // Pre-populate cache
      serviceStatusCache.setServiceStatus('email', cachedStatus);

      const result = await serviceStatusCoordinator.fetchEmailStatus({
        forceRefresh: false,
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).not.toHaveBeenCalled();
      expect(result).toEqual(cachedStatus);
    });
  });

  describe('Cache Management', () => {
    test('should clear all service status cache', () => {
      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      serviceStatusCoordinator.clearCache();

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(false);
    });

    test('should clear specific service cache', () => {
      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      serviceStatusCoordinator.clearServiceCache('whatsapp');

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
      expect(serviceStatusCache.hasServiceStatus('email')).toBe(true);
    });

    test('should provide cache statistics', () => {
      // Pre-populate cache
      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });
      serviceStatusCache.setServiceStatus('email', { initialized: true });

      const stats = serviceStatusCoordinator.getCacheStats();

      expect(stats.serviceCount).toBe(2);
      expect(stats.services.whatsapp).toBeDefined();
      expect(stats.services.email).toBeDefined();
    });

    test('should check if service has cached status', () => {
      expect(serviceStatusCoordinator.hasServiceStatus('whatsapp')).toBe(false);

      serviceStatusCache.setServiceStatus('whatsapp', { configured: true });

      expect(serviceStatusCoordinator.hasServiceStatus('whatsapp')).toBe(true);
    });
  });

  describe('Requirements Validation', () => {
    test('should treat status as session-known after first check (Requirement 7.1)', async () => {
      const mockStatus = { configured: true, ready: true };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockStatus })
      };

      apiCallWithFallback.mockResolvedValue(mockResponse);

      // First call - should hit API
      const firstResult = await serviceStatusCoordinator.fetchWhatsAppStatus({
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledTimes(1);
      expect(firstResult).toEqual(mockStatus);

      // Second call - should use cache
      const secondResult = await serviceStatusCoordinator.fetchWhatsAppStatus({
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledTimes(1); // Still only called once
      expect(secondResult).toEqual(mockStatus);
    });

    test('should recheck on manual refresh (Requirement 7.2)', async () => {
      const initialStatus = { configured: true, ready: false };
      const refreshedStatus = { configured: true, ready: true };

      // First API call
      const mockResponse1 = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: initialStatus })
      };

      apiCallWithFallback.mockResolvedValueOnce(mockResponse1);

      await serviceStatusCoordinator.fetchWhatsAppStatus({
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledTimes(1);

      // Manual refresh - should hit API again
      const mockResponse2 = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: refreshedStatus })
      };

      apiCallWithFallback.mockResolvedValueOnce(mockResponse2);

      const refreshResult = await serviceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh: true,
        screenName: 'TestScreen'
      });

      expect(apiCallWithFallback).toHaveBeenCalledTimes(2);
      expect(refreshResult).toEqual(refreshedStatus);
    });

    test('should clear cache on logout/restart (Requirement 7.3)', async () => {
      // Populate cache
      const mockStatus = { configured: true, ready: true };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockStatus })
      };

      apiCallWithFallback.mockResolvedValue(mockResponse);

      await serviceStatusCoordinator.fetchWhatsAppStatus({
        screenName: 'TestScreen'
      });

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(true);

      // Simulate logout/restart
      serviceStatusCoordinator.clearCache();

      expect(serviceStatusCache.hasServiceStatus('whatsapp')).toBe(false);
    });
  });
});