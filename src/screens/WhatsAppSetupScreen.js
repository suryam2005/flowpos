import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';
import WhatsAppService from '../services/WhatsAppService';

const WhatsAppSetupScreen = ({ navigation }) => {
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: '',
    whatsAppNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await AsyncStorage.getItem('twilioCredentials');
      if (savedCredentials) {
        const parsed = JSON.parse(savedCredentials);
        setCredentials(parsed);
        
        // Initialize WhatsApp service with saved credentials
        await WhatsAppService.initialize(
          parsed.accountSid,
          parsed.authToken,
          parsed.whatsAppNumber
        );
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const saveCredentials = async () => {
    if (!credentials.accountSid || !credentials.authToken || !credentials.whatsAppNumber) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Save credentials securely
      await AsyncStorage.setItem('twilioCredentials', JSON.stringify(credentials));
      
      // Initialize WhatsApp service
      await WhatsAppService.initialize(
        credentials.accountSid,
        credentials.authToken,
        credentials.whatsAppNumber
      );

      Alert.alert(
        'Success! 🎉',
        'WhatsApp integration has been configured successfully. You can now send invoices directly to customers via WhatsApp.',
        [
          { text: 'Test Configuration', onPress: testConfiguration },
          { text: 'Done', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Error saving credentials:', error);
      Alert.alert('Error', 'Failed to save WhatsApp configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const testConfiguration = async () => {
    setIsTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await WhatsAppService.testConfiguration();
      
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

  const openTwilioConsole = () => {
    Linking.openURL('https://console.twilio.com/');
  };

  const openWhatsAppSandbox = () => {
    Linking.openURL('https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.infoTitle}>WhatsApp Business Integration</Text>
          </View>
          <Text style={styles.infoText}>
            Send professional invoices directly to your customers via WhatsApp using Twilio's WhatsApp Business API.
          </Text>
        </View>

        <View style={styles.setupCard}>
          <Text style={styles.sectionTitle}>Twilio Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account SID *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={credentials.accountSid}
              onChangeText={(text) => setCredentials({ ...credentials, accountSid: text })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Found in your Twilio Console dashboard
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Auth Token *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your Twilio Auth Token"
              value={credentials.authToken}
              onChangeText={(text) => setCredentials({ ...credentials, authToken: text })}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Keep this secure - found in Twilio Console
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WhatsApp Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="whatsapp:+14155238886"
              value={credentials.whatsAppNumber}
              onChangeText={(text) => setCredentials({ ...credentials, whatsAppNumber: text })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Your Twilio WhatsApp sandbox number
            </Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.sectionTitle}>Setup Instructions</Text>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create Twilio Account</Text>
              <Text style={styles.stepText}>
                Sign up for a free Twilio account and get your Account SID and Auth Token
              </Text>
              <TouchableOpacity style={styles.linkButton} onPress={openTwilioConsole}>
                <Text style={styles.linkButtonText}>Open Twilio Console →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enable WhatsApp Sandbox</Text>
              <Text style={styles.stepText}>
                Activate WhatsApp sandbox in your Twilio console and get your WhatsApp number
              </Text>
              <TouchableOpacity style={styles.linkButton} onPress={openWhatsAppSandbox}>
                <Text style={styles.linkButtonText}>WhatsApp Sandbox →</Text>
              </TouchableOpacity>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="warning-outline" size={20} color="#f59e0b" />
            <Text style={styles.warningTitle}>Important Notes</Text>
          </View>
          <Text style={styles.warningText}>
            • Twilio WhatsApp sandbox is free for testing but has limitations{'\n'}
            • For production use, you'll need WhatsApp Business API approval{'\n'}
            • Keep your Auth Token secure and never share it{'\n'}
            • Test thoroughly before using with customers
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.testButton, !WhatsAppService.isReady() && styles.buttonDisabled]}
          onPress={testConfiguration}
          disabled={!WhatsAppService.isReady() || isTesting}
          activeOpacity={0.8}
        >
          <Ionicons name={isTesting ? "sync-outline" : "flask-outline"} size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={[styles.testButtonText, !WhatsAppService.isReady() && styles.buttonTextDisabled]}>
            {isTesting ? 'Testing...' : 'Test Configuration'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.buttonDisabled]}
          onPress={saveCredentials}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name={isLoading ? "hourglass-outline" : "save-outline"} size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={[styles.saveButtonText, isLoading && styles.buttonTextDisabled]}>
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    fontSize: 13,
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
    fontSize: 13,
    color: colors.warning.main,
    lineHeight: 18,
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
  },
  buttonTextDisabled: {
    color: colors.background.surface,
  },
});

export default WhatsAppSetupScreen;