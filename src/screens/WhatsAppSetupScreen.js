import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttonStyles';
import LoadingSpinner from '../components/LoadingSpinner';
import WhatsAppService from '../services/WhatsAppService';

const WhatsAppSetupScreen = ({ navigation }) => {
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    // Load WhatsApp settings on mount
    loadWhatsAppSettings();
  }, []);

  // Reload settings when screen comes into focus to prevent UI flash
  useFocusEffect(
    useCallback(() => {
      loadWhatsAppSettings(); // Reload WhatsApp settings when screen comes into focus
    }, [])
  );

  const loadWhatsAppSettings = async () => {
    try {
      const whatsAppSetting = await AsyncStorage.getItem('whatsAppEnabled');
      if (whatsAppSetting) {
        setWhatsAppEnabled(JSON.parse(whatsAppSetting));
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  };

  const toggleWhatsApp = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newValue = !whatsAppEnabled;
      await AsyncStorage.setItem('whatsAppEnabled', JSON.stringify(newValue));
      setWhatsAppEnabled(newValue);

      Alert.alert(
        newValue ? 'WhatsApp Enabled! 🎉' : 'WhatsApp Disabled',
        newValue 
          ? 'You can now send invoices directly to customers via WhatsApp using your device.'
          : 'WhatsApp integration has been disabled.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      Alert.alert('Error', 'Failed to save WhatsApp settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const testWhatsApp = async () => {
    setIsTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Test device WhatsApp availability
      const result = await WhatsAppService.testDeviceWhatsApp();
      
      if (result.success) {
        Alert.alert(
          'Test Successful! ✅',
          'WhatsApp integration is working correctly. Test message sent successfully.',
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Test Failed ❌',
          `Configuration test failed: ${result.error}. Please check your credentials and try again.`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Test Failed ❌',
        `Error testing configuration: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsTesting(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp Setup</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="logo-whatsapp" size={24} color={colors.success.main} />
            <Text style={styles.infoTitle}>WhatsApp Business Integration</Text>
          </View>
          <Text style={styles.infoText}>
            Send professional invoices directly to your customers via WhatsApp using your device.
          </Text>
        </View>

        <View style={styles.setupCard}>
          <Text style={styles.sectionTitle}>WhatsApp Integration</Text>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Enable WhatsApp</Text>
              <Text style={styles.toggleDescription}>
                Send invoices and receipts directly to customers via WhatsApp
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, whatsAppEnabled && styles.toggleButtonActive]}
              onPress={toggleWhatsApp}
              disabled={isLoading}
            >
              <View style={[styles.toggleSlider, whatsAppEnabled && styles.toggleSliderActive]} />
            </TouchableOpacity>
          </View>

          {whatsAppEnabled && (
            <View style={styles.enabledInfo}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
              <Text style={styles.enabledText}>
                WhatsApp integration is enabled. Invoices will be sent via your device's WhatsApp.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enable WhatsApp</Text>
              <Text style={styles.stepText}>
                Toggle the WhatsApp integration above to start sending invoices via WhatsApp
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Send Invoices</Text>
              <Text style={styles.stepText}>
                When creating invoices, you'll see an option to send directly via WhatsApp
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Configure FlowPOS</Text>
              <Text style={styles.stepText}>
                Enter your Twilio credentials above and test the configuration
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary.main} />
            <Text style={styles.warningTitle}>Important Notes</Text>
          </View>
          <Text style={styles.warningText}>
            • WhatsApp must be installed on your device{'\n'}
            • Customers need to have WhatsApp to receive invoices{'\n'}
            • Internet connection required for sending messages{'\n'}
            • Test with a sample invoice before using with customers
          </Text>
        </View>
      </ScrollView>

      {whatsAppEnabled && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.testButton, isTesting && styles.buttonDisabled]}
            onPress={testWhatsApp}
            disabled={isTesting}
            activeOpacity={0.8}
          >
            <Ionicons name={isTesting ? "sync-outline" : "flask-outline"} size={18} color={colors.surface} style={styles.buttonIcon} />
            <Text style={styles.testButtonText}>
              {isTesting ? 'Testing...' : 'Test WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerRight: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: colors.primary.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.primary.main,
    lineHeight: 20,
  },
  setupCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text.primary,
  },
  inputHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructionsCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    color: colors.background.surface,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkButtonText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: colors.warning.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning.main,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.warning.main,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: colors.info.main,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.success.main,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
  },
  buttonTextDisabled: {
    color: colors.background.surface,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Toggle styles
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border.light,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary.main,
  },
  toggleSlider: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSliderActive: {
    transform: [{ translateX: 20 }],
  },
  enabledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.light,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  enabledText: {
    fontSize: 14,
    color: colors.success.dark,
    marginLeft: 8,
    flex: 1,
  },
});

export default WhatsAppSetupScreen;