import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Simple Tour Content Configuration
 * 
 * Defines tour steps for each screen with:
 * - Title and description
 * - Highlight positions (optional)
 * - Simple, informational content only
 */

// Common positions for bottom navigation
const BOTTOM_NAV_HEIGHT = 80;
const BOTTOM_SAFE_AREA = Platform.OS === 'ios' ? 34 : 0;

const getBottomNavPosition = (tabIndex) => ({
  top: SCREEN_HEIGHT - BOTTOM_NAV_HEIGHT - BOTTOM_SAFE_AREA,
  left: (SCREEN_WIDTH / 4) * tabIndex,
  width: SCREEN_WIDTH / 4,
  height: BOTTOM_NAV_HEIGHT,
});

/**
 * Tour content for each screen
 */
export const SIMPLE_TOUR_CONTENT = {
  POS: [
    {
      id: 'pos_welcome',
      title: 'Welcome to FlowPOS',
      description: 'This is your main sales screen where you can add products and process orders.',
      highlight: {
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 0,
        width: SCREEN_WIDTH,
        height: 60,
      },
    },
    {
      id: 'pos_store_name',
      title: 'Store Information',
      description: 'Your store name is displayed here. You can update it in Settings > Store Information.',
      highlight: {
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 60,
      },
    },
    {
      id: 'pos_products',
      title: 'Product Selection',
      description: 'Tap on any product to add it to your cart. Long press to remove products from your inventory.',
      highlight: {
        top: 120,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 200,
      },
    },
    {
      id: 'pos_navigation',
      title: 'Bottom Navigation',
      description: 'Use the bottom navigation to switch between different sections of the app.',
      highlight: getBottomNavPosition(0),
    },
  ],

  Analytics: [
    {
      id: 'analytics_welcome',
      title: 'Analytics Dashboard',
      description: 'View your business performance and insights here.',
      highlight: {
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 0,
        width: SCREEN_WIDTH,
        height: 60,
      },
    },
    {
      id: 'analytics_basic',
      title: 'Basic Analytics',
      description: 'See your daily sales, revenue, and basic business metrics.',
      highlight: {
        top: 120,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 150,
      },
    },
    {
      id: 'analytics_advanced',
      title: 'Advanced Analytics',
      description: 'Access detailed reports, trends, and advanced business insights (available in Growth and Enterprise plans).',
      highlight: {
        top: 290,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 150,
      },
    },
  ],

  Orders: [
    {
      id: 'orders_welcome',
      title: 'Order History',
      description: 'View and manage all your completed orders here.',
      highlight: {
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 0,
        width: SCREEN_WIDTH,
        height: 60,
      },
    },
    {
      id: 'orders_list',
      title: 'Order Management',
      description: 'Browse through your order history, search for specific orders, and view order details.',
      highlight: {
        top: 120,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 300,
      },
    },
  ],

  Manage: [
    {
      id: 'manage_welcome',
      title: 'Business Management',
      description: 'Manage your products, inventory, and store settings from here.',
      highlight: {
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 0,
        width: SCREEN_WIDTH,
        height: 60,
      },
    },
    {
      id: 'manage_products',
      title: 'Update Products',
      description: 'Add new products, edit existing ones, and manage your product catalog.',
      highlight: {
        top: 120,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 80,
      },
    },
    {
      id: 'manage_inventory',
      title: 'Update Inventory',
      description: 'Track stock levels, update quantities, and manage your inventory.',
      highlight: {
        top: 220,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 80,
      },
    },
    {
      id: 'manage_store_info',
      title: 'Store Information',
      description: 'Update your store details, contact information, and business settings.',
      highlight: {
        top: 320,
        left: 20,
        width: SCREEN_WIDTH - 40,
        height: 80,
      },
    },
  ],
};

/**
 * Get tour steps for a specific screen
 * @param {string} screenName - Name of the screen
 * @returns {Array} Array of tour steps
 */
export const getSimpleTourSteps = (screenName) => {
  return SIMPLE_TOUR_CONTENT[screenName] || [];
};

/**
 * Check if a screen has tour content
 * @param {string} screenName - Name of the screen
 * @returns {boolean} True if screen has tour content
 */
export const hasSimpleTour = (screenName) => {
  return !!(SIMPLE_TOUR_CONTENT[screenName] && SIMPLE_TOUR_CONTENT[screenName].length > 0);
};