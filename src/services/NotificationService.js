
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NotificationService {
    constructor() {
        this.STORAGE_KEY = '@flowpos_last_low_stock_notification';
        this.CHANNEL_ID = 'low-stock';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(this.CHANNEL_ID, {
                name: 'Low Stock Alerts',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#F59E0B', // Amber
                enableVibrate: true,
                showBadge: true,
            });
        }

        // Request permissions (optional here, usually done on demand)
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            // Don't block, but log
            console.log('⚠️ [NotificationService] Permissions not granted yet');
        }

        this.isInitialized = true;
        console.log('🔔 [NotificationService] Initialized');
    }

    async checkLowStock(products) {
        if (!products || products.length === 0) return;

        try {
            // 1. Get Settings
            const settingsJson = await AsyncStorage.getItem('@flowpos_store_settings');
            if (!settingsJson) return;

            const settings = JSON.parse(settingsJson);
            const businessSettings = settings.business_settings || {};

            // 2. Check if notifications are enabled
            if (!businessSettings.enableNotifications) {
                console.log('🔔 [NotificationService] Notifications disabled in settings');
                return;
            }

            const threshold = businessSettings.lowStockThreshold || 10; // Default 10

            // 3. Filter low stock items
            const lowStockItems = products.filter(p => {
                // Only check if track_stock is true (or undefined/null which defaults to true in logic usually, but let's be safe)
                if (p.track_stock === false) return false;

                const stock = p.stock_quantity ?? p.stock ?? 0;
                return stock > 0 && stock <= threshold;
            });

            if (lowStockItems.length === 0) return;

            // 4. Rate Limiting (Prevent spamming every fetch)
            // We only notify if the LIST of low stock items CHANGED or it's been a while (e.g. 1 hour)
            // For simplicity in this bug fix, we'll notify if it's been > 4 hours OR if we haven't notified for these specific items?
            // Actually, let's keep it simple: notify once a day? Or simply check last notification time.

            const lastNotifTime = await AsyncStorage.getItem(this.STORAGE_KEY);
            const now = Date.now();
            const COOLDOWN = 1 * 60 * 1000; // 1 minute for testing (change to 24 * 60 * 60 * 1000 for production)

            if (lastNotifTime && (now - parseInt(lastNotifTime)) < COOLDOWN) {
                console.log('🔔 [NotificationService] Cooldown active, skipping notification');
                return;
            }

            // 5. Send Notification
            const itemCount = lowStockItems.length;
            const message = itemCount === 1
                ? `${lowStockItems[0].name} is running low (${lowStockItems[0].stock || 0} remaining).`
                : `${itemCount} products are running low on stock.`;

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Low Stock Alert ⚠️',
                    body: message,
                    data: { type: 'low_stock' },
                    sound: true,
                    badge: itemCount,
                    color: '#F59E0B',
                },
                trigger: null, // Critical: null means "show immediately"
            });

            console.log('🔔 [NotificationService] Notification sent:', message);
            await AsyncStorage.setItem(this.STORAGE_KEY, now.toString());

        } catch (error) {
            console.error('❌ [NotificationService] Error checking low stock:', error);
        }
    }

    async requestPermissions() {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    }

    // For testing: Clear the cooldown timer to allow immediate re-notification
    async clearCooldown() {
        await AsyncStorage.removeItem(this.STORAGE_KEY);
        console.log('🔔 [NotificationService] Cooldown timer cleared');
    }
}

export default new NotificationService();
