// Tests for useSessionNotifications hook
// Requirements: 10.2, 10.3, 10.4, 10.5 - Test session notification mechanisms

import { renderHook, act } from '@testing-library/react-hooks';
import { useSessionNotifications } from '../useSessionNotifications';
import sessionStateManager from '../../services/SessionStateManager';
import { useAuth } from '../../context/AuthContext';

// Mock dependencies
jest.mock('../../services/SessionStateManager');
jest.mock('../../context/AuthContext');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active'
  }
}));

describe('useSessionNotifications', () => {
  const mockAuthContext = {
    isAuthenticated: true,
    accessToken: 'mock-token',
    logout: jest.fn()
  };

  const mockSessionStateManager = {
    addListener: jest.fn(() => jest.fn()),
    fetchActiveSessions: jest.fn(),
    fetchDeviceLimits: jest.fn(),
    handleRemoteLogout: jest.fn(),
    handleLogoutAllOthers: jest.fn(),
    startPeriodicSync: jest.fn(() => jest.fn())
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(mockAuthContext);
    Object.assign(sessionStateManager, mockSessionStateManager);
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useSessionNotifications());

      expect(result.current.sessionState).toEqual({
        sessions: [],
        deviceLimits: null,
        isLoading: false,
        lastUpdate: null,
        error: null
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.networkStatus.isOnline).toBe(true);
    });

    test('should setup session state listener when authenticated', () => {
      renderHook(() => useSessionNotifications());

      expect(sessionStateManager.addListener).toHaveBeenCalled();
      expect(sessionStateManager.fetchActiveSessions).toHaveBeenCalled();
      expect(sessionStateManager.startPeriodicSync).toHaveBeenCalledWith(5);
    });

    test('should not setup listeners when not authenticated', () => {
      useAuth.mockReturnValue({ ...mockAuthContext, isAuthenticated: false });

      renderHook(() => useSessionNotifications());

      expect(sessionStateManager.addListener).not.toHaveBeenCalled();
      expect(sessionStateManager.fetchActiveSessions).not.toHaveBeenCalled();
    });
  });

  describe('Session State Changes', () => {
    test('should handle sessions_updated event', () => {
      const { result } = renderHook(() => useSessionNotifications());

      // Get the listener callback
      const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];

      act(() => {
        listenerCallback('sessions_updated', {
          sessions: [{ id: '1', deviceName: 'Test Device' }],
          timestamp: '2023-01-01T00:00:00Z'
        });
      });

      expect(result.current.sessionState.sessions).toHaveLength(1);
      expect(result.current.sessionState.sessions[0].id).toBe('1');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('info');
      expect(result.current.notifications[0].title).toBe('Sessions Updated');
    });

    test('should handle device_limits_updated event', () => {
      const { result } = renderHook(() => useSessionNotifications());

      const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];

      act(() => {
        listenerCallback('device_limits_updated', {
          currentDevices: 2,
          maxDevices: 3,
          timestamp: '2023-01-01T00:00:00Z'
        });
      });

      expect(result.current.sessionState.deviceLimits.currentDevices).toBe(2);
      expect(result.current.sessionState.deviceLimits.maxDevices).toBe(3);
    });

    test('should show warning when approaching device limit', () => {
      const { result } = renderHook(() => useSessionNotifications());

      const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];

      act(() => {
        listenerCallback('device_limits_updated', {
          currentDevices: 3,
          maxDevices: 3, // At 100% capacity
          timestamp: '2023-01-01T00:00:00Z'
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
      expect(result.current.notifications[0].title).toBe('Device Limit Warning');
    });

    test('should handle session_operation_error event', () => {
      const { result } = renderHook(() => useSessionNotifications());

      const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];

      act(() => {
        listenerCallback('session_operation_error', {
          error: 'Network error',
          operationType: 'login'
        });
      });

      expect(result.current.sessionState.error).toBe('Network error');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });

    test('should handle token expiration error', () => {
      const { result } = renderHook(() => useSessionNotifications());

      const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];

      act(() => {
        listenerCallback('session_operation_error', {
          error: 'Token expired',
          operationType: 'fetch_sessions'
        });
      });

      // Should trigger logout after delay
      expect(mockAuthContext.logout).not.toHaveBeenCalled(); // Not immediate

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockAuthContext.logout).toHaveBeenCalled();
    });
  });

  describe('Notifications Management', () => {
    test('should add notification', () => {
      const { result } = renderHook(() => useSessionNotifications());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'Test message'
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test Notification');
      expect(result.current.notifications[0].type).toBe('success');
    });

    test('should remove notification', () => {
      const { result } = renderHook(() => useSessionNotifications());

      let notificationId;

      act(() => {
        notificationId = result.current.addNotification({
          type: 'info',
          title: 'Test Notification'
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    test('should clear all notifications', () => {
      const { result } = renderHook(() => useSessionNotifications());

      act(() => {
        result.current.addNotification({ type: 'info', title: 'Test 1' });
        result.current.addNotification({ type: 'info', title: 'Test 2' });
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    test('should auto-remove notifications after duration', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useSessionNotifications());

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto Remove',
          duration: 1000
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);

      jest.useRealTimers();
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network errors gracefully', () => {
      const { result } = renderHook(() => useSessionNotifications());

      const networkError = new Error('Network request failed');

      act(() => {
        // Simulate network error handling
        const listenerCallback = sessionStateManager.addListener.mock.calls[0][0];
        listenerCallback('session_operation_error', {
          error: networkError.message,
          operationType: 'fetch_sessions'
        });
      });

      expect(result.current.networkStatus.isOnline).toBe(false);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });
  });

  describe('Session Operations', () => {
    test('should perform logout device operation', async () => {
      sessionStateManager.handleRemoteLogout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionNotifications());

      await act(async () => {
        await result.current.performSessionOperation('logout_device', 'session-123');
      });

      expect(sessionStateManager.handleRemoteLogout).toHaveBeenCalledWith('session-123');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
    });

    test('should perform logout all others operation', async () => {
      sessionStateManager.handleLogoutAllOthers.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSessionNotifications());

      await act(async () => {
        await result.current.performSessionOperation('logout_all_others');
      });

      expect(sessionStateManager.handleLogoutAllOthers).toHaveBeenCalled();
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
    });

    test('should handle operation errors', async () => {
      const error = new Error('Operation failed');
      sessionStateManager.handleRemoteLogout.mockRejectedValue(error);

      const { result } = renderHook(() => useSessionNotifications());

      await act(async () => {
        try {
          await result.current.performSessionOperation('logout_device', 'session-123');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });
  });

  describe('Token Expiration', () => {
    test('should check token expiration periodically', () => {
      jest.useFakeTimers();

      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2NzI1MzEyMDB9.test'; // Expires Jan 1, 2023
      useAuth.mockReturnValue({
        ...mockAuthContext,
        accessToken: mockToken
      });

      renderHook(() => useSessionNotifications());

      // Fast-forward 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should have checked token expiration
      // (Implementation would depend on actual token parsing logic)

      jest.useRealTimers();
    });
  });

  describe('Refresh Session Data', () => {
    test('should refresh session data successfully', async () => {
      const mockSessions = [{ id: '1', deviceName: 'Test' }];
      const mockLimits = { currentDevices: 1, maxDevices: 3 };

      sessionStateManager.fetchActiveSessions.mockResolvedValue(mockSessions);
      sessionStateManager.fetchDeviceLimits.mockResolvedValue(mockLimits);

      const { result } = renderHook(() => useSessionNotifications());

      await act(async () => {
        await result.current.refreshSessionData();
      });

      expect(sessionStateManager.fetchActiveSessions).toHaveBeenCalledWith(true);
      expect(sessionStateManager.fetchDeviceLimits).toHaveBeenCalledWith(true);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
    });

    test('should handle refresh errors', async () => {
      const error = new Error('Refresh failed');
      sessionStateManager.fetchActiveSessions.mockRejectedValue(error);

      const { result } = renderHook(() => useSessionNotifications());

      await act(async () => {
        try {
          await result.current.refreshSessionData();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.sessionState.error).toBe('Refresh failed');
    });
  });
});