import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, BackHandler } from 'react-native';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import InvoiceService from '../services/InvoiceService';
import { colors } from '../styles/colors';
// TOUR TEMPORARILY DISABLED
// import SimpleTourOverlay from '../components/SimpleTourOverlay';
// import useSimpleTour from '../hooks/useSimpleTour';
// TOUR TEMPORARILY DISABLED
// import tourProgressManager from '../services/TourProgressManager';

const SimpleInvoicePreviewScreen = ({ route, navigation }) => {
  const { 
    invoiceData: rawInvoiceData, 
    fromOrderCompletion = true,
    continueTour = false, // Flag to indicate tour continuation from Cart
    showSkipOption = false, // Enable skip countdown after order completion
    showBackButton = false // FIXED: Show back button in invoice (passed from CartScreen)
  } = route.params || {};
  
  const [processedInvoiceData, setProcessedInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // TOUR TEMPORARILY DISABLED - but keep variables for compatibility
  const showTour = false;

  // Simple tour doesn't need overlay refs - removed setOverlayRef usage

  // Check for tour continuation from Cart screen
  // TOUR TEMPORARILY DISABLED
  // // TOUR TEMPORARILY DISABLED
  // useEffect(() => {
  //   //     const checkTourContinuation = async () => {
  //   //       if (!isInitialized) return;
  //   // 
  //   //       // Check if we should continue the tour from Cart
  //   //       if (continueTour) {
  //   //         console.log('🎯 [SimpleInvoicePreviewScreen] Continuing tour from Cart');
  //   //         // Small delay to let the screen render first
  //   //         setTimeout(() => {
  //   //           startTour();
  //   //         }, 500);
  //   //         return;
  //   //       }
  //   // 
  //   //       // Simple tour doesn't need auto-start functionality - removed checkAutoStart
  //   //     };
  //   // 
  //   //     checkTourContinuation();
  //   //   }, [isInitialized, continueTour, startTour]);

  // Tour countdown timer - syncs with the existing 10-sec display
  // When tour is active, we show a countdown and auto-advance after 10 seconds
  // TOUR TEMPORARILY DISABLED
  // useEffect(() => {
  //     if (showTour && currentStep?.id === 'invoice-preview-view') {
  //       setTourCountdown(10);
  //       
  //       tourTimerRef.current = setInterval(() => {
  //         setTourCountdown(prev => {
  //           if (prev <= 1) {
  //             // Clear timer and advance to next step
  //             if (tourTimerRef.current) {
  //               clearInterval(tourTimerRef.current);
  //               tourTimerRef.current = null;
  //             }
  //             // Auto-advance to navigation hint step
  //             setTimeout(() => {
  //               nextStep();
  //             }, 0);
  //             return 0;
  //           }
  //           return prev - 1;
  //         });
  //       }, 1000);
  // 
  //       return () => {
  //         if (tourTimerRef.current) {
  //           clearInterval(tourTimerRef.current);
  //           tourTimerRef.current = null;
  //         }
  //       };
  //     }
  //   }, [showTour, currentStep?.id, nextStep]);

  // TOUR TEMPORARILY DISABLED
  // Handle tour completion - guide to Analytics
  // const handleTourComplete = useCallback(async () => {
  //   console.log('🎯 [SimpleInvoicePreviewScreen] Tour complete, guiding to Analytics');
  //   
  //   // Set continuation to Analytics
  //   await tourProgressManager.setContinueTourTo('Analytics');
  //   
  //   // Navigate to Analytics screen
  //   navigation.navigate('Main', { 
  //     screen: 'Stats',
  //     params: { continueTour: true }
  //   });
  // }, [navigation]);

  // TOUR TEMPORARILY DISABLED
  // Handle next step - check if we need to navigate to Analytics
  // const handleNextStep = useCallback(async () => {
  //   if (currentStep?.nextScreen === 'Analytics') {
  //     // This is the last step, navigate to Analytics
  //     await handleTourComplete();
  //   } else {
  //     nextStep();
  //   }
  // }, [currentStep, nextStep, handleTourComplete]);

  // Navigate to POS screen (used for both auto-redirect and back button)
  const navigateToPOS = () => {
    // Reset navigation stack and go to POS
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'POS' } }],
    });
  };

  // Handle back button - always go to POS after order completion
  useEffect(() => {
    if (fromOrderCompletion) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigateToPOS();
        return true; // Prevent default back behavior
      });

      // Also disable gesture navigation
      navigation.setOptions({
        gestureEnabled: false,
      });

      return () => backHandler.remove();
    }
  }, [fromOrderCompletion, navigation]);

  // Process invoice data through InvoiceService for consistency with OrdersScreen flow
  useEffect(() => {
    const processInvoiceData = async () => {
      try {
        console.log('📄 [SimpleInvoicePreviewScreen] Processing invoice data through InvoiceService...');
        
        // Use InvoiceService to generate complete invoice data (same as InvoiceScreen)
        const processedData = await InvoiceService.generateInvoiceData(rawInvoiceData);
        
        console.log('✅ [SimpleInvoicePreviewScreen] Invoice data processed:', {
          invoiceNumber: processedData.invoiceNumber,
          date: processedData.date,
          time: processedData.time,
          storeName: processedData.storeName,
          customerName: processedData.customerName
        });
        
        setProcessedInvoiceData(processedData);
      } catch (error) {
        console.error('❌ [SimpleInvoicePreviewScreen] Error processing invoice data:', error);
        // Fallback to raw data if processing fails
        setProcessedInvoiceData(rawInvoiceData);
      } finally {
        setIsLoading(false);
      }
    };

    if (rawInvoiceData) {
      processInvoiceData();
    } else {
      setIsLoading(false);
    }
  }, [rawInvoiceData]);

  const handleClose = () => {
    // Always navigate to POS after order completion
    if (fromOrderCompletion) {
      navigateToPOS();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'POS' });
    }
  };

  // Show loading state while processing
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Generating invoice...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SimpleInvoicePreview
        visible={true}
        invoiceData={processedInvoiceData}
        onClose={handleClose}
        showSkipOption={fromOrderCompletion && !showTour} // Hide skip option when tour is active
        showBackButton={showBackButton} // FIXED: Pass showBackButton prop
      />
      
      {/* TOUR TEMPORARILY DISABLED */}
      {/* Interactive Tour Overlay */}
      {/* {showTour && currentStep && (
        <InteractiveTourOverlay
          ref={overlayRef}
          visible={showTour}
          currentStep={{
            ...currentStep,
            // Add countdown to the text for the invoice preview step
            text: currentStep.id === 'invoice-preview-view' 
              ? `${currentStep.text}\n\n⏱️ Continuing in ${tourCountdown}s...`
              : currentStep.text,
          }}
          totalSteps={totalSteps}
          stepIndex={stepIndex}
          onNext={handleNextStep}
          onSkip={skipScreen}
          onSkipAll={skipAll}
          onSkipStep={skipStep}
          showHint={showHint}
          showSkipStep={showSkipStep}
        />
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default SimpleInvoicePreviewScreen;