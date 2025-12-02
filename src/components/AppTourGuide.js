import React, { useState, useEffect, useRef } from 'react';
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

const AppTourGuide = ({ visible, onComplete, currentScreen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);
  const [screenDimensions, setScreenDimensions] = useState({ width, height });

  // Define tour steps for different screens with more accurate positioning
  const tourData = {
    POS: [
      {
        title: 'Welcome to FlowPOS! 🏪',
        description: 'This is your main POS screen where you can add products to cart and process orders.',
        position: { top: 120, left: 20, right: 20 },
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        targetElement: 'header',
      },
      {
        title: 'Product Categories 📂',
        description: 'Filter products by categories. Tap on different tags to see specific product types.',
        position: { top: 200, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 80, left: 0, width: '100%', height: 60 },
        targetElement: 'categories',
      },
      {
        title: 'Product Grid 📦',
        description: 'Browse your products here. Tap to add to cart, long press to remove from cart.',
        position: { top: 300, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 140, left: 20, width: width - 40, height: height * 0.5 },
        targetElement: 'products',
      },
      {
        title: 'Cart Summary 🛒',
        description: 'When you add items, the cart summary appears here. Tap to proceed to checkout.',
        position: { top: height - 200, left: 20, right: 20 },
        highlight: { top: height - 120, left: 0, width: '100%', height: 100 },
        targetElement: 'cart',
      },
    ],
    Cart: [
      {
        title: 'Customer Details 👤',
        description: 'Enter customer information first. Name and phone are required for all orders.',
        position: { top: 150, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: 200 },
        targetElement: 'customer',
      },
      {
        title: 'Payment Methods 💳',
        description: 'Choose how the customer will pay: Cash, Card, or QR Pay (UPI). QR Pay generates automatic QR codes.',
        position: { top: 380, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 300, left: 20, width: width - 40, height: 120 },
        targetElement: 'payment',
      },
      {
        title: 'Order Items 📋',
        description: 'Review the items in the cart. You can adjust quantities or remove items here.',
        position: { top: 520, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 440, left: 20, width: width - 40, height: 200 },
        targetElement: 'items',
      },
      {
        title: 'Complete Order ✅',
        description: 'Tap this button to process the payment and complete the order. You\'ll get an invoice.',
        position: { top: height - 180, left: 20, right: 20 },
        highlight: { top: height - 100, left: 20, width: width - 40, height: 80 },
        targetElement: 'complete',
      },
    ],
    Manage: [
      {
        title: 'Business Management 📊',
        description: 'This is your business control center. Manage products, view orders, and track analytics.',
        position: { top: 120, left: 20, right: 20 },
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        targetElement: 'header',
      },
      {
        title: 'Tab Navigation 📑',
        description: 'Switch between Products, Inventory, Store Settings, and Materials using these tabs.',
        position: { top: 200, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 80, left: 0, width: '100%', height: 60 },
        targetElement: 'tabs',
      },
      {
        title: 'Product Management 📦',
        description: 'Add, edit, and manage your products. This is where you build your inventory.',
        position: { top: 300, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 140, left: 20, width: width - 40, height: height * 0.6 },
        targetElement: 'content',
      },
    ],
    Orders: [
      {
        title: 'Order History 📜',
        description: 'View all your completed orders, search by customer name, and track your sales.',
        position: { top: 120, left: 20, right: 20 },
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        targetElement: 'header',
      },
      {
        title: 'Order List 📋',
        description: 'Tap on any order to see detailed information, customer details, and generate invoices.',
        position: { top: 250, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: height * 0.7 },
        targetElement: 'orders',
      },
    ],
    Analytics: [
      {
        title: 'Business Analytics 📈',
        description: 'Track your business performance with sales data, revenue trends, and customer insights.',
        position: { top: 120, left: 20, right: 20 },
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        targetElement: 'header',
      },
      {
        title: 'Revenue Stats 💰',
        description: 'Monitor daily, weekly, and monthly revenue. See which products are performing best.',
        position: { top: 250, left: 20, right: 20 },
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: height * 0.7 },
        targetElement: 'stats',
      },
    ],
  };

  useEffect(() => {
    if (visible && currentScreen && tourData[currentScreen]) {
      setTourSteps(tourData[currentScreen]);
      setCurrentStep(0);
    }
  }, [visible, currentScreen]);

  useEffect(() => {
    const updateDimensions = ({ window }) => {
      setScreenDimensions({ width: window.width, height: window.height });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      // Mark tour as completed for this screen
      const completedTours = await AsyncStorage.getItem('completedTours');
      const tours = completedTours ? JSON.parse(completedTours) : {};
      tours[currentScreen] = true;
      await AsyncStorage.setItem('completedTours', JSON.stringify(tours));
      
      // Mark overall tour as seen
      await AsyncStorage.setItem('hasSeenAppTour', 'true');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      console.error('Error saving tour completion:', error);
      onComplete();
    }
  };

  // Helper function to calculate smart positioning
  const getSmartPosition = (stepData) => {
    const { position, highlight } = stepData;
    const cardHeight = 200; // Approximate card height
    const margin = 20;

    // If highlight is near bottom, show card above
    if (highlight && highlight.top + highlight.height > screenDimensions.height * 0.7) {
      return {
        ...position,
        top: Math.max(margin, highlight.top - cardHeight - margin),
      };
    }

    // If highlight is near top, show card below
    if (highlight && highlight.top < screenDimensions.height * 0.3) {
      return {
        ...position,
        top: highlight.top + highlight.height + margin,
      };
    }

    // Default positioning
    return position;
  };

  if (!visible || !tourSteps.length) return null;

  const currentStepData = tourSteps[currentStep];
  const smartPosition = getSmartPosition(currentStepData);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Highlight Area */}
        {currentStepData.highlight && (
          <View
            style={[
              styles.highlight,
              {
                top: typeof currentStepData.highlight.top === 'string' 
                  ? currentStepData.highlight.top 
                  : currentStepData.highlight.top,
                left: typeof currentStepData.highlight.left === 'string' 
                  ? currentStepData.highlight.left 
                  : currentStepData.highlight.left,
                width: typeof currentStepData.highlight.width === 'string' 
                  ? currentStepData.highlight.width 
                  : currentStepData.highlight.width,
                height: typeof currentStepData.highlight.height === 'string' 
                  ? currentStepData.highlight.height 
                  : currentStepData.highlight.height,
              },
            ]}
          />
        )}

        {/* Tour Content */}
        <View
          style={[
            styles.tourContent,
            {
              top: typeof smartPosition.top === 'string' 
                ? smartPosition.top 
                : smartPosition.top,
              left: typeof smartPosition.left === 'string' 
                ? smartPosition.left 
                : smartPosition.left,
              right: smartPosition.right || undefined,
            },
          ]}
        >
          <View style={styles.tourCard}>
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

          {/* Arrow pointing to highlighted area */}
          <View style={styles.arrow} />
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
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tourContent: {
    position: 'absolute',
    maxWidth: 320,
    minWidth: 280,
  },
  tourCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
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
  arrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
});

export default AppTourGuide;