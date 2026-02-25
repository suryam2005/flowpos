import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';
import Icon from './SVGIcons';
import { captureRef } from 'react-native-view-shot';
import { colors } from '../styles/colors';
import LoadingOverlay from './LoadingOverlay';
import WhatsAppService from '../services/WhatsAppService';
import InvoiceService from '../services/InvoiceService'; // CONSOLIDATED: Use unified service
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAuth } from '../context/AuthContext';

const SimpleInvoicePreview = ({ 
  visible, 
  invoiceData, 
  onClose,
  refreshTrigger, // Add prop to trigger refresh from parent
  showSkipOption = false, // New prop to show skip countdown
  showBackButton = false // New prop to show back button (for Orders screen)
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [showSendButton, setShowSendButton] = useState(true);
  const [skipCountdown, setSkipCountdown] = useState(10);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Use StoreSettingsContext for receipt settings (replaces AsyncStorage reads)
  const { storeSettings, getReceiptSettings, getStoreProfile } = useStoreSettings();
  const { user } = useAuth();
  
  // Store refs for functions to avoid stale closures in useEffect
  const getReceiptSettingsRef = useRef(getReceiptSettings);
  const getStoreProfileRef = useRef(getStoreProfile);
  
  // Keep refs in sync
  useEffect(() => {
    getReceiptSettingsRef.current = getReceiptSettings;
    getStoreProfileRef.current = getStoreProfile;
  }, [getReceiptSettings, getStoreProfile]);
  
  // Enriched invoice data with store information
  const [enrichedInvoiceData, setEnrichedInvoiceData] = useState(null);
  const invoiceRef = useRef();
  const isMountedRef = useRef(true);
  const timerRef = useRef(null);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Load receipt settings and enrich invoice data on mount
  // Uses refs to avoid infinite loop from function dependencies
  useEffect(() => {
    const enrichInvoiceData = async () => {
      try {
        // Force refresh store settings to ensure latest data
        const { refreshSettings } = require('../context/StoreSettingsContext');
        if (refreshSettings) {
          try {
            await refreshSettings();
            console.log('📄 [SimpleInvoicePreview] Store settings refreshed');
          } catch (refreshError) {
            console.warn('📄 [SimpleInvoicePreview] Store settings refresh failed:', refreshError.message);
          }
        }
        
        // Get store profile from context using ref (replaces AsyncStorage.getItem('storeInfo'))
        const storeProfile = getStoreProfileRef.current();
        
        // Get receipt settings using ref
        const receiptSettings = getReceiptSettingsRef.current();
        
        // Get showStoreName setting from AppSettingsContext cache
        const { getAppSettingFromCache } = require('../context/AppSettingsContext');
        const cachedShowStoreName = getAppSettingFromCache('showStoreNameOnInvoice');
        const showStoreName = cachedShowStoreName !== undefined ? cachedShowStoreName : true;
        
        // Receipt settings already come from context with proper boolean handling
        const settings = {
          ...receiptSettings,
          showStoreName
        };
        
        console.log('📄 [SimpleInvoicePreview] Using receipt settings from context:', settings);

        // Enrich invoice data with store information from context
        if (invoiceData && storeSettings) {
          const actualStoreName = storeProfile.store_name || 'FlowPOS Store';
          
          // Get store phone/email from AuthContext (user-bound fields)
          const storePhone = user?.phone || '';
          const storeEmail = user?.email || '';
          
          const enriched = {
            ...invoiceData,
            // Apply store name setting
            storeName: settings.showStoreName ? actualStoreName : 'FlowPOS Store',
            // Add store contact details from context
            storeAddress: storeProfile.store_address || '',
            // Phone/email are auth-bound, from AuthContext
            storePhone: storePhone,
            storeEmail: storeEmail,
            gstNumber: storeProfile.gst_number || '',
            // Include receipt settings for display logic
            receiptSettings: settings
          };
          
          setEnrichedInvoiceData(enriched);
          console.log('📄 [SimpleInvoicePreview] Enriched invoice data:', {
            storeName: enriched.storeName,
            hasAddress: !!enriched.storeAddress,
            hasPhone: !!enriched.storePhone,
            hasEmail: !!enriched.storeEmail,
            hasGST: !!enriched.gstNumber
          });
        } else {
          setEnrichedInvoiceData(invoiceData);
        }
      } catch (error) {
        console.error('❌ [SimpleInvoicePreview] Error enriching invoice data:', error);
        setEnrichedInvoiceData(invoiceData);
      }
    };

    if (visible && invoiceData) {
      enrichInvoiceData();
    }
  }, [visible, invoiceData, refreshTrigger, storeSettings, user]); // Removed receiptSettings and getStoreProfile - use refs instead

  const generateInvoiceImage = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Capture the invoice as an image
      const uri = await captureRef(invoiceRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      
      return uri;
    } catch (error) {
      console.error('Error generating invoice image:', error);
      Alert.alert('Error', 'Failed to generate invoice image');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareInvoice = async () => {
    const imageUri = await generateInvoiceImage();
    if (imageUri) {
      try {
        // Use enriched data for complete information
        const data = enrichedInvoiceData || invoiceData;
        const totalAmount = Number(data.grandTotal) || Number(data.total) || 0;
        const storeName = data.storeName || 'FlowPOS Store';
        const invoiceNumber = data.invoiceNumber || data.orderNumber || 'N/A';
        const customerName = data.customerName || 'Customer';
        const date = data.date || (data.timestamp ? new Date(data.timestamp).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));
        
        // Build comprehensive share message
        let shareMessage = `🧾 Invoice from ${storeName}\n`;
        shareMessage += `📋 Invoice #: ${invoiceNumber}\n`;
        shareMessage += `👤 Customer: ${customerName}\n`;
        shareMessage += `📅 Date: ${date}\n`;
        shareMessage += `💰 Total: ₹${totalAmount.toFixed(2)}`;
        
        await Share.share({
          url: imageUri,
          message: shareMessage,
        });
      } catch (error) {
        console.error('❌ [SimpleInvoicePreview] Error sharing invoice:', error);
        Alert.alert('Share Failed', 'Unable to share invoice. Please try again.');
      }
    }
  };

  // Use enriched data's receipt settings or fall back to state-loaded settings

  // Handle skip - CANCEL auto-redirect and stay on screen
  const handleSkip = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (isMountedRef.current) {
      setShowSkipButton(false);
      setSkipCountdown(0);
    }
    // Don't call onClose - user wants to STAY on this screen
  };

  // Auto-redirect countdown timer for returning to POS after order completion
  useEffect(() => {
    if (showSkipOption && visible) {
      if (isMountedRef.current) {
        setShowSkipButton(true);
        setSkipCountdown(10);
      }
      
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        
        setSkipCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Auto-navigate to POS after countdown
            if (isMountedRef.current) {
              setShowSkipButton(false);
            }
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
              if (isMountedRef.current) {
                onClose();
              }
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (isMountedRef.current) {
        setShowSkipButton(false);
        setSkipCountdown(10);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showSkipOption, visible, onClose]);

  useEffect(() => {
    // Phase 1 API Optimization: Single WhatsApp status check per component lifecycle
    // Removed duplicate status checks - only check once when component becomes visible
    const checkWhatsAppStatus = async () => {
      try {
        const status = await WhatsAppService.getStatus();
        setWhatsappStatus(status);
        
        console.log('📱 [SimpleInvoicePreview] WhatsApp status check:', {
          sendInvoiceEnabled: status.sendInvoiceEnabled,
          currentMethod: status.currentMethod,
          flowposReady: status.flowposReady,
          hasPhoneNumber: !!invoiceData?.phoneNumber
        });
        
        // Show send button for device WhatsApp when customer has phone number
        // Hide for FlowPOS/Twilio method (auto-send)
        if (status.currentMethod === 'device') {
          // FIXED: For device WhatsApp, show button when customer phone exists
          // regardless of sendInvoiceEnabled setting (manual action required)
          const hasCustomerPhone = invoiceData?.phoneNumber && invoiceData.phoneNumber.trim() !== '';
          if (hasCustomerPhone) {
            console.log('📱 [SimpleInvoicePreview] Device WhatsApp selected with customer phone - showing send button');
            setShowSendButton(true);
          } else {
            console.log('📱 [SimpleInvoicePreview] Device WhatsApp selected but no customer phone - hiding send button');
            setShowSendButton(false);
          }
        } else if (status.currentMethod === 'flowpos') {
          // ALWAYS hide send button for FlowPOS method to prevent errors and confusion
          // Auto-send is disabled, and manual send would cause credential errors
          console.log('📱 [SimpleInvoicePreview] FlowPOS WhatsApp selected - hiding send button (auto-send disabled, prevents credential errors)');
          setShowSendButton(false);
          
          // COMMENTED OUT: Auto-send WhatsApp to prevent duplication and errors
          // when FlowPOS WhatsApp is selected but Twilio credentials not configured
          // if (invoiceData?.phoneNumber && invoiceData.phoneNumber.trim()) {
          //   console.log('📱 [SimpleInvoicePreview] Auto-sending via FlowPOS WhatsApp...');
          //   handleAutoSendWhatsApp();
          // }
          console.log('📱 [SimpleInvoicePreview] Auto-send disabled for FlowPOS WhatsApp - preventing duplication and credential errors');
        } else {
          console.log('📱 [SimpleInvoicePreview] No valid method selected - hiding send button');
          setShowSendButton(false);
        }
      } catch (error) {
        console.error('❌ [SimpleInvoicePreview] Error checking WhatsApp status:', error);
        setShowSendButton(false);
      }
    };

    if (visible && invoiceData) {
      checkWhatsAppStatus();
    }
  }, [visible, invoiceData, refreshTrigger]); // Phase 1: Removed duplicate dependency

  // COMMENTED OUT: handleAutoSendWhatsApp function to prevent duplication and errors
  // when FlowPOS WhatsApp is selected but Twilio credentials not configured
  // 
  // const handleAutoSendWhatsApp = async () => {
  //   try {
  //     // Use enriched data which has proper store information from context
  //     const data = enrichedInvoiceData || invoiceData;
  //     
  //     console.log('📱 Auto-sending via FlowPOS WhatsApp with enriched data:', {
  //       storeName: data.storeName,
  //       customerName: data.customerName,
  //       phoneNumber: data.phoneNumber
  //     });
  //     
  //     const result = await WhatsAppService.sendInvoiceMessage(
  //       data.phoneNumber,
  //       {
  //         ...data,
  //         orderNumber: data.invoiceNumber || data.orderNumber,
  //         items: data.items || [],
  //         // Ensure all store info is passed
  //         storeName: data.storeName,
  //         storeAddress: data.storeAddress,
  //         storePhone: data.storePhone,
  //         storeEmail: data.storeEmail,
  //         gstNumber: data.gstNumber
  //       }
  //     );
  //
  //     if (result.success) {
  //       Alert.alert(
  //         'Invoice Sent Automatically!',
  //         `Invoice has been sent to ${data.customerName} via FlowPOS WhatsApp successfully.`,
  //         [{ text: 'Great!', style: 'default' }]
  //       );
  //     }
  //   } catch (error) {
  //     console.error('❌ Error auto-sending WhatsApp invoice:', error);
  //     // If auto-send fails, show the send button
  //     setShowSendButton(true);
  //   }
  // };

  const handleSendWhatsApp = async () => {
    // Use enriched data which has proper store information from context
    const data = enrichedInvoiceData || invoiceData;
    
    if (!data.phoneNumber || !data.phoneNumber.trim()) {
      Alert.alert(
        'No Phone Number',
        'Customer phone number is required to send invoice via WhatsApp.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // ADDITIONAL CHECK: Prevent manual send for FlowPOS method to avoid credential errors
    try {
      const status = await WhatsAppService.getStatus();
      if (status.currentMethod === 'flowpos') {
        Alert.alert(
          'Feature Not Available',
          'Manual WhatsApp sending is not available for FlowPOS method. Please use device WhatsApp method for manual sending, or configure Twilio credentials for FlowPOS method.',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Switch to Device WhatsApp', 
              onPress: () => {
                // Navigate to WhatsApp settings
                // This would need to be implemented based on your navigation structure
                console.log('📱 User wants to switch to device WhatsApp method');
              }
            }
          ]
        );
        return;
      }
    } catch (error) {
      console.error('❌ Error checking WhatsApp method:', error);
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('📱 [SimpleInvoicePreview] Starting WhatsApp send process with enriched data:', {
        storeName: data.storeName,
        storeAddress: data.storeAddress,
        storePhone: data.storePhone,
        storeEmail: data.storeEmail,
        gstNumber: data.gstNumber,
        customerName: data.customerName,
        phoneNumber: data.phoneNumber
      });
      
      // Phase 1 API Optimization: Single WhatsApp send call
      // Removed duplicate sendInvoiceMessage calls - use enriched data with all store info
      const result = await WhatsAppService.sendInvoiceMessage(
        data.phoneNumber,
        {
          ...data,
          orderNumber: data.invoiceNumber || data.orderNumber,
          items: data.items || [],
          // Ensure all store info is passed
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          storePhone: data.storePhone,
          storeEmail: data.storeEmail,
          gstNumber: data.gstNumber
        }
      );

      if (result.success) {
        const methodText = result.method === 'flowpos' ? 'FlowPOS WhatsApp' : 'Device WhatsApp';
        Alert.alert(
          'Invoice Sent Successfully!',
          `Invoice has been sent to ${data.customerName} via ${methodText} successfully.`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        // Hide send button after successful send for device WhatsApp
        if (result.method === 'device') {
          setShowSendButton(false);
        }
      } else {
        throw new Error('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp invoice:', error);
      
      // Show detailed error message
      let errorMessage = 'Failed to send invoice via WhatsApp.';
      if (error.message.includes('WhatsApp is not installed')) {
        errorMessage = 'WhatsApp is not installed on this device.';
      } else if (error.message.includes('not configured')) {
        errorMessage = 'WhatsApp service is not configured properly.';
      }
      
      Alert.alert(
        'Send Failed ❌',
        errorMessage + ' Would you like to share manually instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Manually', onPress: () => handleShareInvoice() }
        ]
      );
    } finally {
      setIsGenerating(false);
    }
  };



  // Enhanced contact information component with standardized alignment and SVG icons
  const renderContactInformation = () => {
    // Use receipt settings from enriched data, or get fresh from context
    const settings = enrichedInvoiceData?.receiptSettings || getReceiptSettingsRef.current();
    
    const contactFields = [
      {
        show: settings.showAddress,
        value: enrichedInvoiceData?.storeAddress || invoiceData.storeAddress,
        icon: 'location-outline',
        label: 'Address'
      },
      {
        show: settings.showPhone,
        value: enrichedInvoiceData?.storePhone || invoiceData.storePhone,
        icon: 'call-outline',
        label: 'Phone'
      },
      {
        show: settings.showEmail,
        value: enrichedInvoiceData?.storeEmail || invoiceData.storeEmail,
        icon: 'mail-outline',
        label: 'Email'
      },
      {
        show: settings.showGST,
        value: enrichedInvoiceData?.gstNumber || invoiceData.gstNumber,
        icon: 'document-text-outline',
        label: 'GST',
        prefix: 'GST: '
      }
    ];

    const visibleFields = contactFields.filter(field => 
      field.show && field.value && field.value.trim() !== ''
    );

    if (visibleFields.length === 0) return null;

    return (
      <View style={styles.storeContactSection}>
        {visibleFields.map((field, index) => (
          <View key={field.label} style={[
            styles.contactRow,
            index === visibleFields.length - 1 && styles.contactRowLast
          ]}>
            <View style={styles.contactIconContainer}>
              <Icon name={field.icon} size={18} color="#6b7280" />
            </View>
            <Text style={styles.contactText}>
              {field.prefix || ''}{field.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (!visible || !invoiceData) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Auto-redirect countdown banner with Skip option */}
      {showSkipButton && (
        <View style={styles.countdownBanner}>
          <Text style={styles.countdownText}>
            Returning to POS in {skipCountdown}s
          </Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Stay Here</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                console.log('📄 [SimpleInvoicePreview] Back button pressed');
                if (onClose) {
                  onClose();
                }
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>E-Bill</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View ref={invoiceRef} style={styles.invoiceCard}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Svg width={80} height={80} viewBox="0 0 128 128">
              {/* Green Circle with gradient effect */}
              <Defs>
                <LinearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#00E676" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#00C853" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Circle cx="64" cy="64" r="60" fill="url(#successGradient)" />
              {/* White Check Mark with rounded caps */}
              <Path
                d="M38 66 L56 84 L92 44"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Thank You Message */}
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouTitle}>Thank you for your order!</Text>
          </View>

          {/* Store Name - use enriched data */}
          {(enrichedInvoiceData?.storeName || invoiceData.storeName) && enrichedInvoiceData?.receiptSettings?.showStoreName !== false && (
            <View style={styles.storeNameSection}>
              <Text style={styles.storeName}>
                {enrichedInvoiceData?.storeName || invoiceData.storeName}
              </Text>
            </View>
          )}

          {/* Store Contact Information - use standardized component */}
          {renderContactInformation()}

          {/* Customer Info Section */}
          <View style={styles.billedToSection}>
            <Text style={styles.billedToLabel}>Billed to</Text>
            <View style={styles.customerInfo}>
              <View style={styles.customerIcon}>
                <Icon name="person-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>
                  {invoiceData.customerName}
                </Text>
                {invoiceData.phoneNumber && (
                  <View style={styles.customerPhoneRow}>
                    <Icon name="call-outline" size={16} color="#6b7280" />
                    <Text style={styles.customerPhone}>+91 {invoiceData.phoneNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Order Summary Section */}
          <View style={styles.orderSummarySection}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>

            {/* Items List */}
            {invoiceData.items && invoiceData.items.length > 0 ? (
              invoiceData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Icon name="cube-outline" size={18} color="#6b7280" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemDetails}>Qty: {item.quantity}</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>₹{(item.quantity * item.price).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>No items found</Text>
            )}
          </View>

          {/* Total Paid Section */}
          <View style={styles.totalPaidSection}>
            <Text style={styles.totalPaidLabel}>TOTAL PAID:</Text>
            <Text style={styles.totalPaidAmount}>₹{(invoiceData.grandTotal || invoiceData.total || 0).toFixed(2)}</Text>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentMethodSection}>
            <View style={styles.paymentIcon}>
              <Icon 
                name={
                  invoiceData.paymentMethod === 'Cash' ? 'cash-outline' : 
                  invoiceData.paymentMethod === 'Card' ? 'card-outline' : 
                  invoiceData.paymentMethod === 'QR Pay' ? 'qr-code-outline' : 'cash-outline'
                } 
                size={18} 
                color="#6b7280" 
              />
            </View>
            <Text style={styles.paymentMethodText}>Paid with {invoiceData.paymentMethod || 'Cash'}</Text>
          </View>

          {/* Receipt Details */}
          <View style={styles.receiptDetailsSection}>
            <Text style={styles.receiptId}>Receipt #: {invoiceData.invoiceNumber || invoiceData.orderNumber || 'N/A'}</Text>
            <Text style={styles.receiptDate}>Date: {invoiceData.date || (invoiceData.timestamp ? new Date(invoiceData.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))}</Text>
            {invoiceData.time && (
              <Text style={styles.receiptDate}>Time: {invoiceData.time}</Text>
            )}
          </View>

          {/* Footer Message */}
          <View style={styles.footerSection}>
            <Text style={styles.footerMessage}>Thank you for shopping with us!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareInvoice}
          activeOpacity={0.8}
          disabled={isGenerating}
        >
          <Ionicons name="share-outline" size={18} color={colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>
            Share Invoice
          </Text>
        </TouchableOpacity>
        
        {invoiceData.phoneNumber && showSendButton && (
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleSendWhatsApp}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.whatsappButtonText}>
              Send via App
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Overlay */}
      <LoadingOverlay 
        visible={isGenerating} 
        message="Generating invoice..." 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  countdownBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  skipButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  thankYouSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeNameSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  storeContactSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
    minHeight: 22,
  },
  contactRowLast: {
    marginBottom: 0,
  },
  contactIconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 8,
    flexShrink: 0,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    flex: 1,
    textAlign: 'left',
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 28,
  },
  billedToSection: {
    marginBottom: 20,
  },
  billedToLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
    fontWeight: '500',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderSummarySection: {
    marginBottom: 20,
  },
  orderSummaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  customerIcon: {
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  noItems: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  totalPaidSection: {
    marginTop: 20,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPaidLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  totalPaidAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  paymentMethodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#6b7280',
  },
  receiptDetailsSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  receiptId: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 52,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25d366',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SimpleInvoicePreview;