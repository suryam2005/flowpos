import React, { useState, useEffect } from 'react';
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

const ImprovedTourGuide = ({ visible, onComplete, currentScreen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);

  // Improved tour data with accurate positioning based on actual layouts
  const tourData = {
    POS: [
      {
        title: 'Welcome to FlowPOS! 🏪',
        description: 'This is your main POS screen where you can add products to cart and process orders. The header shows your store name.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        cardPosition: 'bottom',
      },
      {
        title: 'Product Categories 📂',
        description: 'Filter products by categories. Tap on different tags to see specific product types like "All Items", "Food", "Drinks", etc.',
        highlight: { top: statusBarHeight + 80, left: 0, width: '100%', height: 70 },
        cardPosition: 'bottom',
      },
      {
        title: 'Adding Products to Cart 📦',
        description: 'TAP ONCE on any product to add 1 item to cart. The product will show a quantity indicator when added.',
        highlight: { top: statusBarHeight + 150, left: 20, width: width - 40, height: Math.max(300, height * 0.4) },
        cardPosition: 'center',
      },
      {
        title: 'Multiple Quantities ➕',
        description: 'TAP MULTIPLE TIMES on the same product to increase quantity. Each tap adds one more item to your cart.',
        highlight: { top: statusBarHeight + 150, left: 20, width: width - 40, height: Math.max(300, height * 0.4) },
        cardPosition: 'center',
      },
      {
        title: 'Removing Products ➖',
        description: 'LONG PRESS on any product to remove ALL quantities of that item from the cart at once.',
        highlight: { top: statusBarHeight + 150, left: 20, width: width - 40, height: Math.max(300, height * 0.4) },
        cardPosition: 'center',
      },
      {
        title: 'Cart Summary 🛒',
        description: 'When you add items, the cart summary appears here. Shows total items and amount. Tap "Complete Order" to checkout.',
        highlight: { top: height - 100, left: 0, width: '100%', height: 100 },
        cardPosition: 'top',
      },
      {
        title: 'Clear Cart 🗑️',
        description: 'Use the trash button in the cart summary to clear all items at once. This removes everything from your current order.',
        highlight: { top: height - 100, left: 0, width: '100%', height: 100 },
        cardPosition: 'top',
      },
    ],
    Cart: [
      {
        title: 'Customer Information 👤',
        description: 'Enter customer details first. Customer name and phone number are required for all orders and help with order tracking.',
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: 180 },
        cardPosition: 'bottom',
      },
      {
        title: 'Order Items Review 📋',
        description: 'Review all cart items here. Adjust quantities with +/- buttons or remove items completely. Shows individual and total prices.',
        highlight: { top: statusBarHeight + 280, left: 20, width: width - 40, height: 200 },
        cardPosition: 'center',
      },
      {
        title: 'Payment Method Selection 💳',
        description: 'Choose how customer will pay: Cash, Card, or QR Pay (UPI). QR Pay automatically generates QR codes for exact amounts.',
        highlight: { top: statusBarHeight + 500, left: 20, width: width - 40, height: 120 },
        cardPosition: 'center',
      },
      {
        title: 'Complete Order ✅',
        description: 'Review the order summary and tap "Complete Order" to process payment and finish the transaction. You\'ll get a professional invoice.',
        highlight: { top: height - 80, left: 20, width: width - 40, height: 60 },
        cardPosition: 'top',
      },
    ],
    Manage: [
      {
        title: 'Business Management 📊',
        description: 'This is your business control center. The header shows your store name and provides access to settings and subscription.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        cardPosition: 'bottom',
      },
      {
        title: 'Tab Navigation 📑',
        description: 'Switch between different management sections: Products (inventory), Inventory (stock), Store Settings, and Materials.',
        highlight: { top: statusBarHeight + 80, left: 0, width: '100%', height: 60 },
        cardPosition: 'bottom',
      },
      {
        title: 'Product Management 📦',
        description: 'Add, edit, and manage your products. Set prices, track stock, add images, and organize with tags. This builds your inventory.',
        highlight: { top: statusBarHeight + 140, left: 20, width: width - 40, height: Math.max(400, height * 0.5) },
        cardPosition: 'center',
      },
    ],
    Orders: [
      {
        title: 'Order History 📜',
        description: 'View all completed orders with order IDs, dates, and customer information. Pull down to refresh the list.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        cardPosition: 'bottom',
      },
      {
        title: 'Order Management 📋',
        description: 'Each order shows customer details, items, payment method, and total. Tap any order for details or to generate/send invoices.',
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: Math.max(400, height * 0.6) },
        cardPosition: 'center',
      },
    ],
    Analytics: [
      {
        title: 'Business Analytics 📈',
        description: 'Track your business performance with comprehensive sales data, revenue trends, and insights. Pull down to refresh data.',
        highlight: { top: statusBarHeight, left: 0, width: '100%', height: 80 },
        cardPosition: 'bottom',
      },
      {
        title: 'Revenue Dashboard 💰',
        description: 'View key metrics: total revenue, order count, average order value, and popular products. Monitor today, weekly, and all-time performance.',
        highlight: { top: statusBarHeight + 80, left: 20, width: width - 40, height: Math.max(400, height * 0.6) },
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

  const getCardPosition = (cardPosition, highlight) => {
    const cardHeight = 240;
    const margin = 20;
    const safeAreaTop = statusBarHeight + 20;
    const safeAreaBottom = height - 100;

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
        let centerTop = height / 2 - cardHeight / 2;
        
        // If center would overlap with highlight, move it
        const highlightCenter = highlight.top + highlight.height / 2;
        if (Math.abs(centerTop + cardHeight / 2 - highlightCenter) < cardHeight / 2 + highlight.height / 2) {
          // Move to the side with more space
          if (highlightCenter < height / 2) {
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