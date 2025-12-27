import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive positioning system - calculates positions based on screen size
const getResponsivePositions = () => {
  const isTablet = SCREEN_WIDTH > 768;
  const headerHeight = Platform.OS === 'ios' ? 100 : 80;
  const bottomSafeArea = Platform.OS === 'ios' ? 34 : 0;
  
  return {
    // POS Screen positions
    POS_HEADER: { 
      top: headerHeight - 30, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 70 
    },
    POS_FIRST_PRODUCT: { 
      top: headerHeight + 100, 
      left: 16, 
      width: isTablet ? (SCREEN_WIDTH - 64) / 3 : (SCREEN_WIDTH - 48) / 2, 
      height: isTablet ? 250 : 200 
    },
    POS_CART_BAR: { 
      top: SCREEN_HEIGHT - 160 - bottomSafeArea, 
      left: 20, 
      width: SCREEN_WIDTH - 40, 
      height: 70 
    },
    POS_COMPLETE_BTN: { 
      top: SCREEN_HEIGHT - 150 - bottomSafeArea, 
      left: SCREEN_WIDTH - 180, 
      width: 150, 
      height: 50 
    },
    POS_EMPTY: { 
      top: SCREEN_HEIGHT / 2 - 80, 
      left: 30, 
      width: SCREEN_WIDTH - 60, 
      height: 160 
    },
    
    // Manage Screen positions
    MANAGE_HEADER: { 
      top: headerHeight - 30, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 70 
    },
    MANAGE_TABS: { 
      top: headerHeight + 40, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 50 
    },
    MANAGE_ADD_BTN: { 
      top: headerHeight + 100, 
      left: SCREEN_WIDTH - 150, 
      width: 130, 
      height: 40 
    },
    MANAGE_LIST: { 
      top: headerHeight + 150, 
      left: 10, 
      width: SCREEN_WIDTH - 20, 
      height: 300 
    },
    
    // Cart Screen positions
    CART_CUSTOMER: { 
      top: headerHeight + 20, 
      left: 20, 
      width: SCREEN_WIDTH - 40, 
      height: 150 
    },
    CART_ITEMS: { 
      top: headerHeight + 190, 
      left: 20, 
      width: SCREEN_WIDTH - 40, 
      height: 200 
    },
    CART_PAYMENT: { 
      top: SCREEN_HEIGHT - 250 - bottomSafeArea, 
      left: 20, 
      width: SCREEN_WIDTH - 40, 
      height: 70 
    },
    CART_COMPLETE: { 
      top: SCREEN_HEIGHT - 130 - bottomSafeArea, 
      left: 20, 
      width: SCREEN_WIDTH - 40, 
      height: 56 
    },
    
    // Orders Screen positions
    ORDERS_HEADER: { 
      top: headerHeight - 30, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 70 
    },
    ORDERS_LIST: { 
      top: headerHeight + 50, 
      left: 10, 
      width: SCREEN_WIDTH - 20, 
      height: SCREEN_HEIGHT - headerHeight - 150 
    },
    
    // Analytics Screen positions
    ANALYTICS_HEADER: { 
      top: headerHeight - 30, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 70 
    },
    ANALYTICS_METRICS: { 
      top: headerHeight + 50, 
      left: 10, 
      width: SCREEN_WIDTH - 20, 
      height: 200 
    },
    
    // Advanced Analytics positions
    ADV_HEADER: { 
      top: headerHeight - 30, 
      left: 0, 
      width: SCREEN_WIDTH, 
      height: 70 
    },
    ADV_FILTERS: { 
      top: headerHeight + 50, 
      left: 10, 
      width: SCREEN_WIDTH - 20, 
      height: 50 
    },
    ADV_CHARTS: { 
      top: headerHeight + 120, 
      left: 10, 
      width: SCREEN_WIDTH - 20, 
      height: 300 
    },
  };
};

// Tour content with improved descriptions
const TOURS = {
  POS: [
    { 
      title: '🏪 Welcome to POS', 
      text: 'This is your main sales screen where you process customer orders.', 
      box: 'POS_HEADER', 
      cardPos: 'bottom' 
    },
    { 
      title: '👆 Add Products', 
      text: 'TAP any product to add it to the cart. The quantity will increase with each tap.', 
      box: 'POS_FIRST_PRODUCT', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '✋ Remove Products', 
      text: 'LONG PRESS any product to remove it from the cart.', 
      box: 'POS_FIRST_PRODUCT', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '🛒 Cart Summary', 
      text: 'Your cart summary appears here. Tap to view full cart details.', 
      box: 'POS_CART_BAR', 
      cardPos: 'top', 
      interact: true 
    },
    { 
      title: '✅ Complete Order', 
      text: 'Tap here to proceed to checkout and complete the sale.', 
      box: 'POS_COMPLETE_BTN', 
      cardPos: 'top', 
      interact: true, 
      nextScreen: 'Cart' 
    },
  ],
  POS_EMPTY: [
    { 
      title: '📦 No Products Yet', 
      text: 'You need to add products first. Let\'s go to the Manage screen to add some products.', 
      box: 'POS_EMPTY', 
      cardPos: 'bottom', 
      nextScreen: 'Manage', 
      autoNav: true 
    },
  ],
  Manage: [
    { 
      title: '📊 Manage Your Store', 
      text: 'This is where you control your products, inventory, and store settings.', 
      box: 'MANAGE_HEADER', 
      cardPos: 'bottom' 
    },
    { 
      title: '📑 Navigation Tabs', 
      text: 'Switch between Products, Inventory, and Store Settings using these tabs.', 
      box: 'MANAGE_TABS', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '➕ Add New Product', 
      text: 'Tap here to create new products for your store.', 
      box: 'MANAGE_ADD_BTN', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '✏️ Manage Products', 
      text: 'View, edit, or delete your existing products from this list.', 
      box: 'MANAGE_LIST', 
      cardPos: 'top', 
      interact: true 
    },
  ],
  Cart: [
    { 
      title: '👤 Customer Details', 
      text: 'Enter customer information for the invoice and receipt.', 
      box: 'CART_CUSTOMER', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '📋 Order Items', 
      text: 'Review the items in this order. You can still modify quantities here.', 
      box: 'CART_ITEMS', 
      cardPos: 'top', 
      interact: true 
    },
    { 
      title: '💳 Payment Method', 
      text: 'Select how the customer will pay for this order.', 
      box: 'CART_PAYMENT', 
      cardPos: 'top', 
      interact: true 
    },
    { 
      title: '✅ Complete Sale', 
      text: 'Finalize the transaction and generate the invoice.', 
      box: 'CART_COMPLETE', 
      cardPos: 'top', 
      interact: true 
    },
  ],
  Orders: [
    { 
      title: '📋 Order History', 
      text: 'View all your completed orders and their details.', 
      box: 'ORDERS_HEADER', 
      cardPos: 'bottom' 
    },
    { 
      title: '📄 Order Actions', 
      text: 'Tap any order to view details, generate invoice, or send via WhatsApp.', 
      box: 'ORDERS_LIST', 
      cardPos: 'top', 
      interact: true 
    },
  ],
  Analytics: [
    { 
      title: '📈 Business Analytics', 
      text: 'Monitor your business performance and sales trends.', 
      box: 'ANALYTICS_HEADER', 
      cardPos: 'bottom' 
    },
    { 
      title: '📊 Key Metrics', 
      text: 'View revenue, order count, and other important business metrics.', 
      box: 'ANALYTICS_METRICS', 
      cardPos: 'bottom', 
      interact: true 
    },
  ],
  AdvancedAnalytics: [
    { 
      title: '📊 Advanced Analytics', 
      text: 'Detailed insights and advanced reporting for your business.', 
      box: 'ADV_HEADER', 
      cardPos: 'bottom' 
    },
    { 
      title: '🔍 Time Filters', 
      text: 'Filter your analytics by different time periods.', 
      box: 'ADV_FILTERS', 
      cardPos: 'bottom', 
      interact: true 
    },
    { 
      title: '📈 Visual Charts', 
      text: 'Interactive charts showing your business data trends.', 
      box: 'ADV_CHARTS', 
      cardPos: 'top', 
      interact: true 
    },
  ],
};

const ImprovedTourGuide = ({ visible, onComplete, currentScreen, navigation, hasProducts = true }) => {
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [positions, setPositions] = useState({});

  // Update positions when screen dimensions change
  useEffect(() => {
    const updatePositions = () => {
      setPositions(getResponsivePositions());
    };
    
    updatePositions();
    
    const subscription = Dimensions.addEventListener('change', updatePositions);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (visible && currentScreen) {
      // Determine which tour to show
      let tourSteps;
      if (currentScreen === 'POS' && !hasProducts) {
        tourSteps = TOURS.POS_EMPTY;
      } else {
        tourSteps = TOURS[currentScreen] || [];
      }
      
      setSteps(tourSteps);
      setStep(0);
      console.log(`🎯 [TourGuide] Starting ${currentScreen} tour with ${tourSteps.length} steps`);
    }
  }, [visible, currentScreen, hasProducts]);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentStep = steps[step];
    
    // Handle auto-navigation
    if (currentStep?.autoNav && currentStep?.nextScreen) {
      console.log(`🎯 [TourGuide] Auto-navigating to ${currentStep.nextScreen}`);
      await AsyncStorage.setItem('continueTourTo', currentStep.nextScreen);
      navigation.navigate(currentStep.nextScreen);
      onComplete();
      return;
    }
    
    // Handle manual navigation
    if (currentStep?.nextScreen && step === steps.length - 1) {
      console.log(`🎯 [TourGuide] Navigating to ${currentStep.nextScreen} after tour completion`);
      await AsyncStorage.setItem('continueTourTo', currentStep.nextScreen);
      navigation.navigate(currentStep.nextScreen);
      onComplete();
      return;
    }
    
    // Move to next step
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark all tours as completed when skipping
    try {
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      // Clear any pending tour continuation
      await AsyncStorage.removeItem('continueTourTo');
      
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      
      // Mark all screens as completed
      Object.keys(TOURS).forEach(screenName => {
        tours[screenName] = true;
      });
      
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      console.log('🎯 [TourGuide] All tours marked as completed (skipped)');
    } catch (error) {
      console.error('Error skipping tours:', error);
    }
    
    onComplete();
  };

  if (!visible || steps.length === 0) {
    return null;
  }

  const currentStep = steps[step];
  const currentBox = positions[currentStep.box];
  
  if (!currentBox) {
    console.warn(`🎯 [TourGuide] Position not found for ${currentStep.box}`);
    return null;
  }

  // Calculate card position
  const cardTop = currentStep.cardPos === 'top' 
    ? currentBox.top - 120 
    : currentBox.top + currentBox.height + 20;
  
  const cardLeft = Math.max(20, Math.min(SCREEN_WIDTH - 320, currentBox.left));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Highlight box */}
        <View
          style={[
            styles.highlightBox,
            {
              top: currentBox.top,
              left: currentBox.left,
              width: currentBox.width,
              height: currentBox.height,
            },
          ]}
        />
        
        {/* Tour card */}
        <View
          style={[
            styles.tourCard,
            {
              top: cardTop,
              left: cardLeft,
            },
          ]}
        >
          <Text style={styles.tourTitle}>{currentStep.title}</Text>
          <Text style={styles.tourText}>{currentStep.text}</Text>
          
          {/* Progress dots */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {step === steps.length - 1 ? 'Done' : 'Next'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  tourCard: {
    position: 'absolute',
    width: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  tourText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});

export default ImprovedTourGuide;