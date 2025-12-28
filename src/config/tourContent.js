import { Dimensions, Platform } from 'react-native';

/**
 * TourContentRegistry - Central registry for all tour content and configurations
 * 
 * Defines step configurations for all screens including:
 * - Highlight positions
 * - Action types for interactive steps
 * - Hint texts for timeouts
 * - Interactive vs informational step markers
 * 
 * Tour Flow Order (unified):
 * 1. POS: Interactive sales flow
 * 2. Cart: Complete order (interactive)
 * 3. InvoicePreview: View invoice (wait for existing 10-sec feature)
 * 4. Analytics: Business metrics (informational)
 * 5. Orders: Order history (informational)
 * 6. ManageProducts: Product management (interactive)
 * 7. ManageInventory: Inventory tracking (interactive)
 */

// Unified tour flow order
const TOUR_FLOW_ORDER = [
  'POS',
  'Cart', 
  'InvoicePreview',
  'Analytics',
  'Orders',
  'ManageProducts',
  'ManageInventory'
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Action types supported by the tour system
const ACTION_TYPES = {
  TAP: 'tap',
  LONG_PRESS: 'long-press',
  SWIPE: 'swipe',
  TEXT_INPUT: 'text-input',
  NAVIGATION: 'navigation',
  TAB_CHANGE: 'tab-change',
  MODAL_OPEN: 'modal-open',
  MODAL_CLOSE: 'modal-close',
};

/**
 * Dynamic position overrides - set by screens that measure actual component positions
 * This allows screens to provide accurate positions based on actual component measurements
 */
let dynamicPositionOverrides = {};

/**
 * Set dynamic position override for a highlight zone
 * @param {string} key - Position key (e.g., 'POS_CART_BAR')
 * @param {Object} position - Position object with top, left, width, height
 */
const setDynamicPosition = (key, position) => {
  if (position && typeof position.top === 'number' && typeof position.left === 'number') {
    dynamicPositionOverrides[key] = position;
    console.log(`🎯 [tourContent] Dynamic position set for ${key}:`, position);
  }
};

/**
 * Clear dynamic position override for a highlight zone
 * @param {string} key - Position key to clear
 */
const clearDynamicPosition = (key) => {
  delete dynamicPositionOverrides[key];
  console.log(`🎯 [tourContent] Dynamic position cleared for ${key}`);
};

/**
 * Clear all dynamic position overrides
 */
const clearAllDynamicPositions = () => {
  dynamicPositionOverrides = {};
  console.log(`🎯 [tourContent] All dynamic positions cleared`);
};

/**
 * Get responsive highlight positions based on screen dimensions
 * Dynamic overrides take precedence over static positions
 * @returns {Object} Position configurations for all highlight zones
 */
const getResponsivePositions = () => {
  const isTablet = SCREEN_WIDTH > 768;
  const bottomSafeArea = Platform.OS === 'ios' ? 34 : 0;
  const bottomNavHeight = 80; // Actual bottom nav height
  
  const staticPositions = {
    // POS Screen positions
    POS_HEADER: { 
      top: Platform.OS === 'ios' ? 50 : 40, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 60 
    },
    // First product card in the grid (top-left)
    POS_FIRST_PRODUCT: { 
      top: Platform.OS === 'ios' ? 180 : 170, 
      left: 16, 
      width: isTablet ? (SCREEN_WIDTH - 64) / 3 : (SCREEN_WIDTH - 48) / 2, 
      height: isTablet ? 200 : 180 
    },
    // POS_CART_BAR and POS_COMPLETE_BTN use fallback static positions
    // These will be overridden by dynamic measurements from POSScreen
    POS_CART_BAR: { 
      top: SCREEN_HEIGHT - bottomNavHeight - 90 - bottomSafeArea, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: 70
    },
    POS_COMPLETE_BTN: { 
      top: SCREEN_HEIGHT - bottomNavHeight - 80 - bottomSafeArea, 
      left: SCREEN_WIDTH - 150, 
      width: 120, 
      height: 40 
    },
    POS_EMPTY: { 
      top: SCREEN_HEIGHT / 2 - 100, 
      left: 40, 
      width: SCREEN_WIDTH - 80, 
      height: 200 
    },
    
    // Cart Screen positions (for Cart tour)
    CART_HEADER: {
      top: Platform.OS === 'ios' ? 50 : 40,
      left: 0,
      width: SCREEN_WIDTH,
      height: 60
    },
    // Order summary section near bottom
    CART_ORDER_SUMMARY: {
      top: SCREEN_HEIGHT - 300,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 160
    },
    // Complete order button at bottom
    CART_COMPLETE_BTN: {
      top: SCREEN_HEIGHT - 120,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 56
    },
    
    // Invoice Preview positions (for InvoicePreview tour)
    INVOICE_HEADER: {
      top: Platform.OS === 'ios' ? 50 : 40,
      left: 0,
      width: SCREEN_WIDTH,
      height: 60
    },
    // Invoice card takes most of the screen
    INVOICE_CARD: {
      top: Platform.OS === 'ios' ? 120 : 110,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: SCREEN_HEIGHT - 320
    },
    
    // Bottom Navigation positions (for navigation hints)
    // Tab order: POS (index 0), Stats (index 1), Orders (index 2), Manage (index 3)
    // Each tab takes 25% of screen width (4 tabs = 100%)
    // Tab centers: POS=12.5%, Stats=37.5%, Orders=62.5%, Manage=87.5%
    BOTTOM_NAV_POS: {
      top: SCREEN_HEIGHT - bottomNavHeight - bottomSafeArea,
      left: 0,
      width: SCREEN_WIDTH * 0.25,
      height: bottomNavHeight
    },
    BOTTOM_NAV_STATS: {
      top: SCREEN_HEIGHT - bottomNavHeight - bottomSafeArea,
      left: SCREEN_WIDTH * 0.25,
      width: SCREEN_WIDTH * 0.25,
      height: bottomNavHeight
    },
    BOTTOM_NAV_ORDERS: {
      top: SCREEN_HEIGHT - bottomNavHeight - bottomSafeArea,
      left: SCREEN_WIDTH * 0.5,
      width: SCREEN_WIDTH * 0.25,
      height: bottomNavHeight
    },
    BOTTOM_NAV_MANAGE: {
      top: SCREEN_HEIGHT - bottomNavHeight - bottomSafeArea,
      left: SCREEN_WIDTH * 0.75,
      width: SCREEN_WIDTH * 0.25,
      height: bottomNavHeight
    },
    
    // Manage Screen positions
    // Header is at top with safe area padding
    MANAGE_HEADER: { 
      top: Platform.OS === 'ios' ? 50 : 40, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 60 
    },
    // Tab bar is below header (Products, Inventory, Store Settings)
    MANAGE_TABS: { 
      top: Platform.OS === 'ios' ? 110 : 100, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 50 
    },
    // Add Product button is in the top right of content area
    MANAGE_ADD_BTN: { 
      top: Platform.OS === 'ios' ? 170 : 160, 
      left: SCREEN_WIDTH - 160, 
      width: 140, 
      height: 44 
    },
    MANAGE_PRODUCT_NAME_FIELD: {
      top: 250,
      left: 20,
      width: SCREEN_WIDTH - 40,
      height: 60
    },
    MANAGE_PRICE_FIELD: {
      top: 330,
      left: 20,
      width: SCREEN_WIDTH - 40,
      height: 60
    },
    MANAGE_SAVE_BTN: {
      top: 470,
      left: 20,
      width: SCREEN_WIDTH - 40,
      height: 50
    },
    // Product list starts below the add button
    MANAGE_LIST: { 
      top: Platform.OS === 'ios' ? 220 : 210, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: 200 
    },
    // First product card in the list
    MANAGE_PRODUCT_CARD: {
      top: Platform.OS === 'ios' ? 220 : 210,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 90
    },
    // Edit/Delete buttons are on the right side of product card
    MANAGE_EDIT_DELETE_BTNS: {
      top: Platform.OS === 'ios' ? 240 : 230,
      left: SCREEN_WIDTH - 110,
      width: 90,
      height: 50
    },
    
    // Inventory Tab positions
    // Inventory tab is the middle tab (index 1 of 3 tabs in Manage screen)
    INVENTORY_TAB: {
      top: Platform.OS === 'ios' ? 110 : 100,
      left: SCREEN_WIDTH / 3,
      width: SCREEN_WIDTH / 3,
      height: 50
    },
    // Inventory list starts below tabs
    INVENTORY_LIST: {
      top: Platform.OS === 'ios' ? 220 : 210,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 200
    },
    INVENTORY_LOW_STOCK: {
      top: Platform.OS === 'ios' ? 220 : 210,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 90
    },
    // First product item in inventory list
    INVENTORY_PRODUCT_ITEM: {
      top: Platform.OS === 'ios' ? 220 : 210,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 90
    },
    INVENTORY_ADJUST_MODAL: {
      top: SCREEN_HEIGHT / 2 - 150,
      left: 30,
      width: SCREEN_WIDTH - 60,
      height: 300
    },
    
    // Orders Screen positions
    ORDERS_HEADER: { 
      top: Platform.OS === 'ios' ? 50 : 40, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 60 
    },
    // Orders list takes most of the screen
    ORDERS_LIST: { 
      top: Platform.OS === 'ios' ? 120 : 110, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: SCREEN_HEIGHT - bottomNavHeight - 200 
    },
    // First order item in the list
    ORDERS_ITEM: {
      top: Platform.OS === 'ios' ? 120 : 110,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 100
    },
    
    // Analytics Screen positions
    ANALYTICS_HEADER: { 
      top: Platform.OS === 'ios' ? 50 : 40, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 60 
    },
    // Key metrics cards below header
    ANALYTICS_METRICS: { 
      top: Platform.OS === 'ios' ? 120 : 110, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: 180 
    },
    ANALYTICS_TIME_FILTER: {
      top: Platform.OS === 'ios' ? 60 : 50,
      left: SCREEN_WIDTH - 150,
      width: 130,
      height: 40
    },
    ANALYTICS_ADVANCED_LINK: {
      top: SCREEN_HEIGHT - bottomNavHeight - 100 - bottomSafeArea,
      left: 20,
      width: SCREEN_WIDTH - 40,
      height: 50
    },
    
    // Advanced Analytics positions
    ADV_HEADER: { 
      top: 50, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 60 
    },
    ADV_FILTERS: { 
      top: 120, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: 50 
    },
    ADV_CHARTS: { 
      top: 190, 
      left: 16, 
      width: SCREEN_WIDTH - 32, 
      height: 250 
    },
    ADV_TOP_PRODUCTS: {
      top: 460,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 150
    },
    ADV_PEAK_HOURS: {
      top: 630,
      left: 16,
      width: SCREEN_WIDTH - 32,
      height: 150
    },
  };
  
  // Merge dynamic position overrides (they take precedence)
  return { ...staticPositions, ...dynamicPositionOverrides };
};

/**
 * Tour flow configurations for all screens
 */
const TOUR_FLOWS = {
  // POS Screen - Interactive Tour
  POS: {
    interactive: true,
    flowPosition: 0,
    steps: [
      {
        id: 'pos-welcome',
        title: '🏪 Welcome to POS',
        text: 'This is your main sales screen where you process customer orders.',
        highlightBox: 'POS_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'pos-add-product',
        title: '👆 Add a Product',
        text: 'TAP any product to add it to your cart.',
        highlightBox: 'POS_FIRST_PRODUCT',
        cardPosition: 'bottom',
        interactive: true,
        actionType: ACTION_TYPES.TAP,
        actionTarget: 'product-card',
        hintText: 'Tap on any product card to add it to your cart',
        successMessage: 'Great! Product added to cart!',
      },
      {
        id: 'pos-increase-quantity',
        title: '➕ Increase Quantity',
        text: 'TAP the same product again to increase the quantity.',
        highlightBox: 'POS_FIRST_PRODUCT',
        cardPosition: 'bottom',
        interactive: true,
        actionType: ACTION_TYPES.TAP,
        actionTarget: 'product-card',
        hintText: 'Tap the product again to add more',
        successMessage: 'Quantity increased!',
      },
      {
        id: 'pos-remove-product',
        title: '✋ Remove from Cart',
        text: 'LONG PRESS any product to remove it from the cart.',
        highlightBox: 'POS_FIRST_PRODUCT',
        cardPosition: 'bottom',
        interactive: true,
        actionType: ACTION_TYPES.LONG_PRESS,
        actionTarget: 'product-card',
        hintText: 'Press and hold on a product to remove it',
        successMessage: 'Product removed!',
      },
      {
        id: 'pos-add-back',
        title: '🔄 Add Product Back',
        text: 'TAP a product to add it back to your cart.',
        highlightBox: 'POS_FIRST_PRODUCT',
        cardPosition: 'bottom',
        interactive: true,
        actionType: ACTION_TYPES.TAP,
        actionTarget: 'product-card',
        hintText: 'Tap any product to add it to cart',
        successMessage: 'Product added!',
      },
      {
        id: 'pos-cart-summary',
        title: '🛒 Cart Summary',
        text: 'Your cart summary appears here showing total items and amount.',
        highlightBox: 'POS_CART_BAR',
        cardPosition: 'top',
        interactive: false,
      },
      {
        id: 'pos-complete-order',
        title: '✅ Complete Order',
        text: 'TAP here to proceed to checkout and complete the sale.',
        highlightBox: 'POS_COMPLETE_BTN',
        cardPosition: 'top',
        interactive: true,
        actionType: ACTION_TYPES.NAVIGATION,
        actionTarget: 'complete-order-btn',
        hintText: 'Tap the Complete Order button to proceed',
        successMessage: 'Proceeding to checkout!',
        nextScreen: 'Cart',
      },
    ],
  },

  // POS Empty State - Redirect to Manage
  POS_EMPTY: {
    interactive: false,
    flowPosition: 0,
    steps: [
      {
        id: 'pos-empty-redirect',
        title: '📦 No Products Yet',
        text: "You need to add products first. Let's go to the Manage screen to add some products.",
        highlightBox: 'POS_EMPTY',
        cardPosition: 'bottom',
        interactive: false,
        nextScreen: 'Manage',
        autoNav: true,
      },
    ],
  },

  // Cart Screen - Interactive Tour (NEW)
  // Requirements: 3.1 - Cart Screen Demo Flow
  // Handles both Cash and QR payment scenarios
  Cart: {
    interactive: true,
    flowPosition: 1,
    steps: [
      {
        id: 'cart-order-details',
        title: '📋 Order Details',
        text: 'Review your order details, customer info, and payment method before completing the sale.',
        highlightBox: 'CART_ORDER_SUMMARY',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'cart-complete-order',
        title: '✅ Complete Order',
        text: 'TAP the button to complete the sale. For QR Pay, it will generate a QR code. For Cash, it will confirm payment.',
        highlightBox: 'CART_COMPLETE_BTN',
        cardPosition: 'top',
        interactive: true,
        actionType: ACTION_TYPES.TAP,
        actionTarget: 'complete-order-btn',
        hintText: 'Tap the button to complete the sale',
        successMessage: 'Order completed!',
        nextScreen: 'InvoicePreview',
      },
    ],
  },

  // Invoice Preview - Wait for existing 10-sec display (NEW)
  // Requirements: 3.2 - Invoice Preview Demo Flow
  InvoicePreview: {
    interactive: false,
    flowPosition: 2,
    waitForExisting: true, // Use existing 10-sec display feature
    steps: [
      {
        id: 'invoice-preview-view',
        title: '🧾 Invoice Preview',
        text: 'This is the invoice for the completed order. The invoice will display for 10 seconds.',
        highlightBox: 'INVOICE_CARD',
        cardPosition: 'bottom',
        interactive: false,
        waitDuration: 10000, // Wait for existing 10-sec feature
      },
      {
        id: 'invoice-preview-next',
        title: '📊 Next: Stats',
        text: 'After viewing the invoice, tap Stats in the bottom bar to see your business analytics.',
        highlightBox: 'BOTTOM_NAV_STATS',
        cardPosition: 'top',
        interactive: false,
        showNavigationHint: true,
        navigationHintText: 'Tap Stats in the bottom bar',
        nextScreen: 'Analytics',
      },
    ],
  },

  // Manage Products Tab - Informational Tour (simplified - no clicking required)
  // Flow: Show tabs → Show Add Product button → Show edit/delete → Continue to Inventory
  ManageProducts: {
    interactive: false,
    flowPosition: 5,
    steps: [
      {
        id: 'manage-welcome',
        title: '📊 Manage Your Store',
        text: 'This is where you control your products, inventory, and store settings.',
        highlightBox: 'MANAGE_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'manage-tabs',
        title: '📑 Three Tabs',
        text: 'Products, Inventory, and Store Settings - switch between them using these tabs.',
        highlightBox: 'MANAGE_TABS',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'manage-add-btn',
        title: '➕ Add Product Button',
        text: 'Tap here anytime to add a new product to your store.',
        highlightBox: 'MANAGE_ADD_BTN',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'manage-edit-delete',
        title: '✏️ Edit & Delete',
        text: 'Use these buttons to edit or delete any product.',
        highlightBox: 'MANAGE_EDIT_DELETE_BTNS',
        cardPosition: 'bottom',
        interactive: false,
        continueToScreen: 'ManageInventory',
      },
    ],
  },

  // Manage Inventory Tab - Informational Tour (simplified)
  // Flow: Show Inventory tab → Show Update button
  ManageInventory: {
    interactive: false,
    flowPosition: 6,
    steps: [
      {
        id: 'inventory-tab-info',
        title: '📦 Inventory Tab',
        text: 'Switch to the Inventory tab to manage stock levels for all your products.',
        highlightBox: 'INVENTORY_TAB',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'inventory-update-info',
        title: '👆 Update Stock',
        text: 'Tap the Update button on any product to adjust its stock quantity.',
        highlightBox: 'INVENTORY_PRODUCT_ITEM',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'inventory-complete',
        title: '🎉 Tour Complete!',
        text: 'You now know the basics of FlowPOS. Start selling and managing your business!',
        highlightBox: 'MANAGE_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
    ],
  },

  // Orders Screen - Informational Tour
  // Requirements: 5.1 - Orders Screen Demo Flow
  Orders: {
    interactive: false,
    flowPosition: 4,
    steps: [
      {
        id: 'orders-welcome',
        title: '📋 Order History',
        text: 'View all your completed orders and their details here.',
        highlightBox: 'ORDERS_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'orders-list',
        title: '📄 Your Orders',
        text: 'All completed orders appear in this list. You should see the order you just created!',
        highlightBox: 'ORDERS_LIST',
        cardPosition: 'top',
        interactive: false,
      },
      {
        id: 'orders-actions',
        title: '🔍 Order Actions',
        text: 'Tap any order to view details, generate invoice, or send via WhatsApp.',
        highlightBox: 'ORDERS_ITEM',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'orders-next',
        title: '📦 Next: Manage',
        text: 'Now tap Manage in the bottom bar to learn about product and inventory management.',
        highlightBox: 'BOTTOM_NAV_MANAGE',
        cardPosition: 'top',
        interactive: false,
        showNavigationHint: true,
        navigationHintText: 'Tap Manage in the bottom bar',
        nextScreen: 'ManageProducts',
      },
    ],
  },

  // Analytics Screen - Informational Tour
  // Requirements: 4.1 - Analytics Screen Demo Flow (After Invoice)
  Analytics: {
    interactive: false,
    flowPosition: 3,
    steps: [
      {
        id: 'analytics-welcome',
        title: '📈 Business Analytics',
        text: 'Monitor your business performance and sales trends.',
        highlightBox: 'ANALYTICS_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'analytics-metrics',
        title: '📊 Key Metrics',
        text: 'View revenue, order count, and other important business metrics.',
        highlightBox: 'ANALYTICS_METRICS',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'analytics-next',
        title: '📋 Next: Orders',
        text: 'Now tap Orders in the bottom bar to see your order history.',
        highlightBox: 'BOTTOM_NAV_ORDERS',
        cardPosition: 'top',
        interactive: false,
        showNavigationHint: true,
        navigationHintText: 'Tap Orders in the bottom bar',
        nextScreen: 'Orders',
      },
    ],
  },

  // Advanced Analytics Screen - Informational Tour
  AdvancedAnalytics: {
    interactive: false,
    steps: [
      {
        id: 'adv-welcome',
        title: '📊 Advanced Analytics',
        text: 'Detailed insights and advanced reporting for your business.',
        highlightBox: 'ADV_HEADER',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'adv-filters',
        title: '🔍 Time Range Filters',
        text: 'Select different time ranges to analyze your business data.',
        highlightBox: 'ADV_FILTERS',
        cardPosition: 'bottom',
        interactive: false,
      },
      {
        id: 'adv-charts',
        title: '📈 Visual Charts',
        text: 'Interactive charts showing your sales trends and patterns.',
        highlightBox: 'ADV_CHARTS',
        cardPosition: 'top',
        interactive: false,
      },
      {
        id: 'adv-top-products',
        title: '🏆 Top Products',
        text: 'See your best-selling products and their performance.',
        highlightBox: 'ADV_TOP_PRODUCTS',
        cardPosition: 'top',
        interactive: false,
      },
      {
        id: 'adv-peak-hours',
        title: '⏰ Peak Hours',
        text: 'Discover when your business is busiest to optimize staffing.',
        highlightBox: 'ADV_PEAK_HOURS',
        cardPosition: 'top',
        interactive: false,
      },
    ],
  },
};

/**
 * Get tour flow for a specific screen
 * @param {string} screenName - Name of the screen
 * @returns {Object|null} Tour flow configuration
 */
const getTourFlow = (screenName) => {
  return TOUR_FLOWS[screenName] || null;
};

/**
 * Get steps for a specific screen
 * @param {string} screenName - Name of the screen
 * @returns {Array} Array of tour steps
 */
const getTourSteps = (screenName) => {
  const flow = TOUR_FLOWS[screenName];
  return flow ? flow.steps : [];
};

/**
 * Check if a screen tour is interactive
 * @param {string} screenName - Name of the screen
 * @returns {boolean}
 */
const isInteractiveTour = (screenName) => {
  const flow = TOUR_FLOWS[screenName];
  return flow ? flow.interactive : false;
};

/**
 * Get all screen names that have tours
 * @returns {string[]}
 */
const getAllTourScreens = () => {
  return Object.keys(TOUR_FLOWS);
};

/**
 * Get interactive tour screens only
 * @returns {string[]}
 */
const getInteractiveTourScreens = () => {
  return Object.keys(TOUR_FLOWS).filter(screen => TOUR_FLOWS[screen].interactive);
};

/**
 * Get informational tour screens only
 * @returns {string[]}
 */
const getInformationalTourScreens = () => {
  return Object.keys(TOUR_FLOWS).filter(screen => !TOUR_FLOWS[screen].interactive);
};

/**
 * Get the next screen in the tour flow
 * @param {string} currentScreen - Current screen name
 * @returns {string|null} Next screen name or null if at end
 */
const getNextTourScreen = (currentScreen) => {
  const currentIndex = TOUR_FLOW_ORDER.indexOf(currentScreen);
  if (currentIndex === -1 || currentIndex >= TOUR_FLOW_ORDER.length - 1) {
    return null;
  }
  return TOUR_FLOW_ORDER[currentIndex + 1];
};

/**
 * Get the flow position for a screen
 * @param {string} screenName - Screen name
 * @returns {number} Flow position (0-6) or -1 if not found
 */
const getTourFlowPosition = (screenName) => {
  return TOUR_FLOW_ORDER.indexOf(screenName);
};

/**
 * Check if a screen is the last in the tour flow
 * @param {string} screenName - Screen name
 * @returns {boolean}
 */
const isLastTourScreen = (screenName) => {
  return TOUR_FLOW_ORDER.indexOf(screenName) === TOUR_FLOW_ORDER.length - 1;
};

export {
  ACTION_TYPES,
  TOUR_FLOWS,
  TOUR_FLOW_ORDER,
  getResponsivePositions,
  setDynamicPosition,
  clearDynamicPosition,
  clearAllDynamicPositions,
  getTourFlow,
  getTourSteps,
  isInteractiveTour,
  getAllTourScreens,
  getInteractiveTourScreens,
  getInformationalTourScreens,
  getNextTourScreen,
  getTourFlowPosition,
  isLastTourScreen,
};

export default TOUR_FLOWS;
