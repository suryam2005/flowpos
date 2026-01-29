import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authColors as colors } from '../../styles/authColors';
import { buttonStyles } from '../../styles/buttonStyles';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAppSettingsContext } from '../../context/AppSettingsContext';

const BusinessPreferencesOnboardingScreen = ({ navigation }) => {
  const { updateSettings } = useAppSettingsContext();
  
  // Default: Require customer details ON (recommended for new users)
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Save settings to backend and context
      const success = await updateSettings({
        requireCustomerDetails
      });
      
      if (!success) {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Business preferences saved:', { requireCustomerDetails });
      
      // Navigate to Product Onboarding
      navigation.navigate('ProductOnboarding');
    } catch (error) {
      console.error('Error saving business preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Use default values (customer details ON, auto payment OFF)
    // Navigate directly without saving (defaults will be used)
    navigation.navigate('ProductOnboarding');
  };

  const BenefitItem = ({ text }) => (
    <View style={styles.benefitItem}>
      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.emoji}>📋</Text>
          <Text style={styles.title}>Set Up Your Business Rules</Text>
          <Text style={styles.subtitle}>
            Configure how you want to manage customer information
          </Text>
        </View>

        {/* Customer Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="person" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Customer Information</Text>
            </View>
            {requireCustomerDetails && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Require Customer Details</Text>
              <Text style={styles.settingDescription}>
                Make customer name and phone mandatory at checkout
              </Text>
            </View>
            <Switch
              value={requireCustomerDetails}
              onValueChange={setRequireCustomerDetails}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={requireCustomerDetails ? colors.primary : colors.textSecondary}
            />
          </View>

          {requireCustomerDetails && (
            <View style={styles.benefitsList}>
              <BenefitItem text="Better customer tracking" />
              <BenefitItem text="Send invoices via WhatsApp" />
              <BenefitItem text="Build customer database" />
              <BenefitItem text="Improve customer service" />
              <BenefitItem text="Enable follow-up communications" />
            </View>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.noteBox}>
          <Ionicons name="bulb-outline" size={20} color={colors.primary} />
          <Text style={styles.noteText}>
            You can change these settings anytime from the Settings screen
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[buttonStyles.primary, styles.continueButton, isLoading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={buttonStyles.primaryText}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && (
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  recommendedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  benefitsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    marginLeft: 8,
    lineHeight: 18,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default BusinessPreferencesOnboardingScreen;
