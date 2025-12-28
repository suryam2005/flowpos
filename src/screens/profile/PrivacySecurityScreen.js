import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import { useAuth } from '../../context/AuthContext';

const PrivacySecurityScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const privacyReport = {
        user_id: user?.id,
        email: user?.email,
        export_date: new Date().toISOString(),
      };

      const reportString = JSON.stringify(privacyReport, null, 2);
      
      await Share.share({
        message: `FlowPOS Privacy Report\n\nGenerated on: ${new Date().toLocaleDateString()}\n\nReport:\n${reportString}`,
        title: 'FlowPOS Privacy Report',
      });
    } catch (error) {
      console.error('Error exporting privacy data:', error);
      Alert.alert('Error', 'Failed to export privacy data');
    }
  };

  const handleViewPrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'FlowPOS Privacy Commitment:\n\n' +
      '📱 Data Collection\n' +
      '• We collect only essential data for app functionality\n' +
      '• Business data (products, orders) is stored securely\n' +
      '• Personal info is used only for account management\n\n' +
      '🔒 Data Security\n' +
      '• All data is encrypted in transit and at rest\n' +
      '• We use industry-standard security practices\n' +
      '• Regular security audits are performed\n\n' +
      '🚫 What We Don\'t Do\n' +
      '• We never sell your personal information\n' +
      '• We don\'t share data with third parties for marketing\n' +
      '• We don\'t track your location\n\n' +
      '✅ Your Rights\n' +
      '• Request data export anytime\n' +
      '• Request account deletion\n' +
      '• Opt-out of analytics and communications',
      [{ text: 'OK' }]
    );
  };

  const handleClearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all locally cached data on this device. Your account and cloud data will not be affected.\n\nYou will need to log in again after clearing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              // Clear all AsyncStorage except auth tokens
              const keysToKeep = ['accessToken', 'refreshToken', 'userToken'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              Alert.alert(
                'Data Cleared',
                'Local data has been cleared. The app will now restart.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Logout to force fresh start
                      logout();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error clearing local data:', error);
              Alert.alert('Error', 'Failed to clear local data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleManagePermissions = () => {
    Alert.alert(
      'App Permissions',
      'Manage what data FlowPOS can access on your device',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  // Coming Soon Badge Component
  const ComingSoonBadge = () => (
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonText}>Coming Soon</Text>
    </View>
  );

  const renderComingSoonItem = (title, subtitle) => (
    <View style={[styles.settingItem, styles.settingItemDisabled]}>
      <View style={styles.settingContent}>
        <View style={styles.settingTitleRow}>
          <Text style={styles.settingTitle}>{title}</Text>
          <ComingSoonBadge />
        </View>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </View>
  );

  const renderSection = (title, subtitle, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Profile')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Communication Preferences - Coming Soon (not connected to backend) */}
        {renderSection(
          'Communication Preferences',
          'Choose what communications you want to receive',
          <>
            {renderComingSoonItem(
              'Marketing Emails',
              'Receive promotional emails and offers'
            )}
            {renderComingSoonItem(
              'Product Updates',
              'Get notified about new features and updates'
            )}
            {renderComingSoonItem(
              'Security Alerts',
              'Receive important security notifications'
            )}
            {renderComingSoonItem(
              'Survey Invitations',
              'Participate in surveys to help improve FlowPOS'
            )}
          </>
        )}

        {/* Data & Analytics - Coming Soon (not connected to backend) */}
        {renderSection(
          'Data & Analytics',
          'Control how your data is used',
          <>
            {renderComingSoonItem(
              'Analytics',
              'Help improve FlowPOS by sharing anonymous usage data'
            )}
            {renderComingSoonItem(
              'Crash Reporting',
              'Automatically send crash reports to help fix bugs'
            )}
          </>
        )}

        {/* App Permissions - Opens device settings */}
        {renderSection(
          'App Permissions',
          'Manage device permissions for FlowPOS',
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleManagePermissions}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Manage App Permissions</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Privacy Tools - Working features */}
        {renderSection(
          'Privacy Tools',
          'Tools to manage your privacy and data',
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewPrivacyPolicy}
            >
              <Ionicons name="document-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
            >
              <Ionicons name="download-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Export Privacy Report</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearLocalData}
            >
              <Ionicons name="trash-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Clear Local Data</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Data Deletion - Coming Soon */}
        {renderSection(
          'Account Data',
          'Manage your account data',
          <>
            {renderComingSoonItem(
              'Request Data Deletion',
              'Permanently delete all your account data'
            )}
          </>
        )}

        {/* Coming Soon Features */}
        {renderSection(
          'Advanced Security',
          'Enhanced security features',
          <>
            {renderComingSoonItem(
              'Two-Factor Authentication',
              'Add extra security to your account'
            )}
            {renderComingSoonItem(
              'Biometric Lock',
              'Use fingerprint or face to unlock app'
            )}
            {renderComingSoonItem(
              'Security Audit Log',
              'View all security-related activities'
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingContent: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: colors.warning.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning.main,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 12,
  },
  bottomPadding: {
    height: 40,
  },
});

export default PrivacySecurityScreen;
