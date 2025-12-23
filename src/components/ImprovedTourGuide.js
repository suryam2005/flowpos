import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Bottom navigation bar height (tab bar)
const BOTTOM_NAV_HEIGHT = 80;
// Safe area for content (above bottom nav)
const CONTENT_BOTTOM = height - BOTTOM_NAV_HEIGHT;

const ImprovedTourGuide = ({ visible, onComplete, currentScreen, navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);

  // Improved tour data with accurate positioning based on actual layouts
  // All positions account for: statusBar, header, bottom nav bar
  const tourData = {
    POS: [
      {
        title: 'Welcome to FlowPOS! 🏪',
        description: 'This is your main POS screen where you can add products to cart and process orders. The header shows your store name.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Product Categories 📂',
        description: 'Filter products by categories. Tap on different tags to see specific product types like "All Items", "Food", "Drinks", etc.',
        highlight: { top: statusBarHeight + 70, left: 0, width: '100%', height: 68 },
        cardPosition: 'bottom',
      },
      {
        title: 'Product Grid 📦',
        description: 'Your products are displayed here. Each card shows the product name, price, and image. Products with low stock show a warning badge.',
        highlight: { top: statusBarHeight + 138, left: 16, width: width - 32, height: Math.min(350, CONTENT_BOTTOM - statusBarHeight - 220) },
        cardPosition: 'center',
      },
      {
        title: '➕ Adding Products to Cart',
        description: 'TAP ONCE on any product card to add 1 item to your cart. You\'ll see a quantity badge appear on the product showing how many are in cart.',
        highlight: { top: statusBarHeight + 138, left: 16, width: (width - 48) / 2, height: 160 },
        cardPosition: 'center',
      },
      {
        title: '➕➕ Adding Multiple Items',
        description: 'TAP MULTIPLE TIMES on the same product to increase quantity. Each tap adds one more item. The quantity badge updates instantly!',
        highlight: { top: statusBarHeight + 138, left: 16, width: (width - 48) / 2, height: 160 },
        cardPosition: 'center',
      },
      {
        title: '➖ Removing Products',
        description: 'LONG PRESS (hold for 1 second) on any product to remove ALL quantities of that item from cart at once. Great for quick corrections!',
        highlight: { top: statusBarHeight + 138, left: 16, width: (width - 48) / 2, height: 160 },
        cardPosition: 'center',
      },
      {
        title: 'Cart Summary 🛒',
        description: 'When you add items, the cart summary appears at the bottom. It shows total items count and total amount. Tap "Complete Order" to proceed to checkout.',
        highlight: { top: CONTENT_BOTTOM - 90, left: 20, width: width - 40, height: 80 },
        cardPosition: 'top',
      },
      {
        title: 'Clear All Items 🗑️',
        description: 'Use the trash icon button in the cart summary to clear ALL items at once. This removes everything from your current order instantly.',
        highlight: { top: CONTENT_BOTTOM - 90, left: 20, width: 60, height: 80 },
        cardPosition: 'top',
      },
      {
        title: 'Ready to Checkout! ✅',
        description: 'Tap "Complete Order" to go to the Cart screen where you can enter customer details, choose payment method, and finalize the order.',
        highlight: { top: CONTENT_BOTTOM - 90, left: width - 180, width: 160, height: 80 },
        cardPosition: 'top',
        nextScreen: 'Cart', // Indicates this step should navigate to Cart
      },
    ],
    Cart: [
      {
        title: 'Customer Information 👤',
        description: 'Enter customer details first. Customer name and phone number are required for all orders and help with order tracking.',
        highlight: { top: statusBarHeight + 60, left: 16, width: width - 32, height: 160 },
        cardPosition: 'bottom',
      },
      {
        title: 'Order Items Review 📋',
        description: 'Review all cart items here. Adjust quantities with +/- buttons or remove items completely. Shows individual and total prices.',
        highlight: { top: statusBarHeight + 240, left: 16, width: width - 32, height: 180 },
        cardPosition: 'center',
      },
      {
        title: 'Payment Method Selection 💳',
        description: 'Choose how customer will pay: Cash or QR Pay (UPI). QR Pay automatically generates QR codes for exact amounts.',
        highlight: { top: statusBarHeight + 440, left: 16, width: width - 32, height: 100 },
        cardPosition: 'top',
      },
      {
        title: 'Complete Order ✅',
        description: 'Review the order summary and tap "Complete Order" to process payment and finish the transaction. You\'ll get a professional invoice.',
        highlight: { top: CONTENT_BOTTOM - 70, left: 16, width: width - 32, height: 56 },
        cardPosition: 'top',
      },
    ],
    Manage: [
      {
        title: 'Business Management 📊',
        description: 'This is your business control center. The header shows your store name and provides access to settings and subscription.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Tab Navigation 📑',
        description: 'Switch between different management sections: Products (inventory), Inventory (stock), Store Settings, and Materials.',
        highlight: { top: statusBarHeight + 70, left: 0, width: '100%', height: 50 },
        cardPosition: 'bottom',
      },
      {
        title: 'Product Management 📦',
        description: 'Add, edit, and manage your products. Set prices, track stock, add images, and organize with tags. This builds your inventory.',
        highlight: { top: statusBarHeight + 120, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 200) },
        cardPosition: 'center',
      },
    ],
    Orders: [
      {
        title: 'Order History 📜',
        description: 'View all completed orders with order IDs, dates, and customer information. Pull down to refresh the list.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Order Management 📋',
        description: 'Each order shows customer details, items, payment method, and total. Tap any order for details or to generate/send invoices.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    Analytics: [
      {
        title: 'Business Analytics 📈',
        description: 'Track your business performance with comprehensive sales data, revenue trends, and insights. Pull down to refresh data.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Revenue Dashboard 💰',
        description: 'View key metrics: total revenue, order count, average order value, and popular products. Monitor today, weekly, and all-time performance.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    Settings: [
      {
        title: 'App Settings ⚙️',
        description: 'Configure your app preferences, business settings, and integrations. Customize FlowPOS to work best for your business.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Business Configuration 🏪',
        description: 'Set up WhatsApp integration, invoice settings, payment methods, and other business-specific configurations.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    WhatsAppSetup: [
      {
        title: 'WhatsApp Business Integration 📱',
        description: 'Set up WhatsApp to automatically send professional invoices to your customers. This uses Twilio\'s WhatsApp Business API.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Twilio Configuration 🔧',
        description: 'Enter your Twilio credentials to connect WhatsApp. You\'ll need Account SID, Auth Token, and WhatsApp number from your Twilio console.',
        highlight: { top: statusBarHeight + 100, left: 16, width: width - 32, height: Math.min(280, CONTENT_BOTTOM - statusBarHeight - 200) },
        cardPosition: 'center',
      },
      {
        title: 'Test & Save 💾',
        description: 'Always test your configuration first to ensure it works properly, then save it. Your customers will receive professional invoices via WhatsApp.',
        highlight: { top: CONTENT_BOTTOM - 80, left: 16, width: width - 32, height: 60 },
        cardPosition: 'top',
      },
    ],
    PerformanceInsights: [
      {
        title: 'Performance Analytics 📊',
        description: 'Monitor your business performance with advanced insights, health scores, and optimization recommendations.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Business Health Score 💪',
        description: 'View your overall business health score and get actionable insights to improve performance and efficiency.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    StorageManagement: [
      {
        title: 'Cloud Storage Management ☁️',
        description: 'Monitor your cloud storage usage, manage data efficiently, and optimize storage costs across your FlowPOS account.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Storage Analytics 📈',
        description: 'View detailed storage breakdowns by data type, track usage trends, and get recommendations for optimization.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    AdvancedAnalytics: [
      {
        title: 'Advanced Business Analytics 📊',
        description: 'Deep dive into your business performance with advanced charts, filters, and detailed insights. Export comprehensive reports.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Interactive Filters 🔍',
        description: 'Use powerful filters to analyze specific time periods, categories, or products. Get exactly the insights you need.',
        highlight: { top: statusBarHeight + 70, left: 0, width: '100%', height: 50 },
        cardPosition: 'bottom',
      },
      {
        title: 'Summary Cards 📋',
        description: 'Scroll through key metrics cards to see revenue, orders, items sold, and averages. Cards are horizontally scrollable!',
        highlight: { top: statusBarHeight + 120, left: 0, width: '100%', height: 80 },
        cardPosition: 'bottom',
      },
      {
        title: 'Export Reports 📄',
        description: 'Generate and export detailed PDF reports with comprehensive analytics data for business planning and record keeping.',
        highlight: { top: statusBarHeight + 200, left: 16, width: width - 32, height: 50 },
        cardPosition: 'bottom',
      },
    ],
    DataExport: [
      {
        title: 'Data Export Center 📤',
        description: 'Export your business data in various formats (CSV, PDF, Excel) for analysis, backup, or integration with other systems.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Export Options 📋',
        description: 'Choose what data to export: orders, products, customers, or analytics. Select date ranges and formats that suit your needs.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    PDFReports: [
      {
        title: 'Professional PDF Reports 📄',
        description: 'Generate comprehensive business reports in PDF format with charts, analytics, and professional formatting.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Report Templates 📋',
        description: 'Choose from various report templates: sales summary, inventory report, customer analysis, and financial overview.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    Subscription: [
      {
        title: 'Subscription Management 💎',
        description: 'Manage your FlowPOS subscription, view plan features, usage limits, and upgrade options for enhanced capabilities.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Plan Features 🚀',
        description: 'See what features are available in your current plan and what you can unlock with upgrades. Track usage and limits.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
    Profile: [
      {
        title: 'User Profile 👤',
        description: 'Manage your personal information, business details, and account settings. Keep your profile updated for better service.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Account Management 🔧',
        description: 'Access account settings, privacy controls, security options, and profile editing tools from this central hub.',
        highlight: { top: statusBarHeight + 70, left: 16, width: width - 32, height: Math.min(400, CONTENT_BOTTOM - statusBarHeight - 150) },
        cardPosition: 'center',
      },
    ],
  };

  useEffect(() => {
    if (visible && currentScreen && tourData[currentScreen]) {
      setTourSteps(tourData[currentScreen]);
      setCurrentStep(0);
    }
  }, [visible, currentScreen]);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentStepData = tourSteps[currentStep];
    
    // Check if this step should navigate to another screen
    if (currentStepData?.nextScreen && navigation) {
      // Save current tour progress
      try {
        const completedTours = await AsyncStorage.getItem('completedTours');
        const tours = completedTours ? JSON.parse(completedTours) : {};
        tours[currentScreen] = true;
        await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
        await AsyncStorage.setItem('hasSeenAppTour', 'true');
        
        // Store that we're continuing the tour
        await AsyncStorage.setItem('continueTourTo', currentStepData.nextScreen);
        
        console.log(`🎯 [${currentScreen}] Navigating to ${currentStepData.nextScreen} for continued tour`);
      } catch (error) {
        console.error('Error saving tour progress:', error);
      }
      
      // Complete current tour and navigate
      onComplete();
      
      // Navigate to the next screen with tour flag
      setTimeout(() => {
        navigation.navigate(currentStepData.nextScreen, { startTour: true });
      }, 300);
      return;
    }
    
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      console.log(`🎯 [${currentScreen}] Skip button pressed - skipping all tours`);
      
      // Mark overall app tour as seen
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      // Mark all screen tours as completed (core features only)
      const allScreens = [
        'POS', 'Cart', 'Manage', 'Orders', 'Analytics', 'Settings', 
        'WhatsAppSetup', 'PerformanceInsights', 'StorageManagement',
        'AdvancedAnalytics', 'DataExport', 'PDFReports', 'Subscription'
      ];
      const tours = {};
      allScreens.forEach(screen => {
        tours[screen] = true;
      });
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      console.log(`🎯 [${currentScreen}] All tours skipped successfully`);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      console.error('Error skipping all tours:', error);
      // Still complete the current tour even if skip all fails
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      console.log(`🎯 [${currentScreen}] Tour completed - saving completion status`);
      
      // Mark tour as completed for this screen
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      tours[currentScreen] = true;
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      // Mark overall tour as seen
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      console.log(`🎯 [${currentScreen}] Tour completion saved successfully`);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      console.error('Error saving tour completion:', error);
      onComplete();
    }
  };

  const getCardPosition = (cardPosition, highlight) => {
    const cardHeight = 220;
    const margin = 16;
    const safeAreaTop = statusBarHeight + 10;
    const safeAreaBottom = CONTENT_BOTTOM - 20; // Account for bottom nav

    switch (cardPosition) {
      case 'top':
        // Position above the highlight, but ensure it's visible
        const topPosition = Math.max(safeAreaTop, highlight.top - cardHeight - margin);
        return {
          top: topPosition,
          left: margin,
          right: margin,
        };
      case 'bottom':
        // Position below the highlight, but ensure it fits on screen
        const bottomPosition = Math.min(
          safeAreaBottom - cardHeight,
          highlight.top + highlight.height + margin
        );
        return {
          top: Math.max(safeAreaTop, bottomPosition),
          left: margin,
          right: margin,
        };
      case 'center':
      default:
        // Center the card, avoiding the highlight area
        let centerTop = (safeAreaTop + safeAreaBottom) / 2 - cardHeight / 2;
        
        // If center would overlap with highlight, move it
        const highlightCenter = highlight.top + highlight.height / 2;
        const cardCenter = centerTop + cardHeight / 2;
        
        if (Math.abs(cardCenter - highlightCenter) < (cardHeight / 2 + highlight.height / 2 + margin)) {
          // Move to the side with more space
          if (highlightCenter < (safeAreaTop + safeAreaBottom) / 2) {
            centerTop = highlight.top + highlight.height + margin;
          } else {
            centerTop = highlight.top - cardHeight - margin;
          }
        }
        
        return {
          top: Math.max(safeAreaTop, Math.min(safeAreaBottom - cardHeight, centerTop)),
          left: margin,
          right: margin,
        };
    }
  };

  if (!visible || !tourSteps.length) return null;

  const currentStepData = tourSteps[currentStep];
  const cardPosition = getCardPosition(currentStepData.cardPosition, currentStepData.highlight);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Highlight Area */}
        <View
          style={[
            styles.highlight,
            {
              top: currentStepData.highlight.top,
              left: currentStepData.highlight.left,
              width: typeof currentStepData.highlight.width === 'string' 
                ? currentStepData.highlight.width 
                : currentStepData.highlight.width,
              height: currentStepData.highlight.height,
            },
          ]}
        />

        {/* Tour Card */}
        <View style={[styles.tourCard, cardPosition]}>
          <View style={styles.tourHeader}>
            <Text style={styles.tourTitle}>{currentStepData.title}</Text>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tourDescription}>
            {currentStepData.description}
          </Text>

          <View style={styles.tourFooter}>
            <View style={styles.stepIndicators}>
              {tourSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepIndicator,
                    index === currentStep && styles.stepIndicatorActive,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === tourSteps.length - 1 ? 'Got it!' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  tourCard: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    maxHeight: 250,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  skipButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  tourDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 20,
  },
  tourFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginRight: 6,
  },
  stepIndicatorActive: {
    backgroundColor: '#3b82f6',
    width: 20,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ImprovedTourGuide;