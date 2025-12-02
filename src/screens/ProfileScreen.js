import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { safeGoBack } from '../utils/navigationUtils';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

const ProfileScreen = ({ navigation }) => {
  const { logout, user, isAuthenticated, refreshUserData } = useAuth();
  const { subscriptionPlan, getPlanDisplayName, refreshSubscription } = useSubscription();
  const [userInfo, setUserInfo] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      
      // If authenticated, try to fetch fresh data from database
      if (isAuthenticated && (forceRefresh || !user)) {
        const freshUserData = await refreshUserData();
        if (freshUserData) {
          setUserInfo(freshUserData);
        } else if (user) {
          setUserInfo(user);
        }
      } else if (user) {
        setUserInfo(user);
      } else {
        // Fallback to AsyncStorage
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
      }

      // Load store info from AsyncStorage
      const storeData = await AsyncStorage.getItem('storeInfo');
      if (storeData) {
        setStoreInfo(JSON.parse(storeData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadUserData(true),
      refreshSubscription()
    ]);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              
              // Navigate to Welcome screen or Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
              
              Alert.alert('Signed Out', 'You have been successfully signed out.');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const profileOptions = [
    {
      id: 'edit-profile',
      icon: '✏️',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => navigation.navigate('EditProfile'),
    },

    {
      id: 'subscription',
      icon: '👑',
      title: 'Subscription',
      subtitle: 'Manage your plan and billing',
      onPress: () => navigation.navigate('Subscription'),
    },
    {
      id: 'account-settings',
      icon: '🔐',
      title: 'Account Settings',
      subtitle: 'Password, security, and preferences',
      onPress: () => navigation.navigate('AccountSettings'),
    },
    {
      id: 'privacy',
      icon: '🛡️',
      title: 'Privacy & Security',
      subtitle: 'Control your data and privacy',
      onPress: () => navigation.navigate('PrivacySecurity'),
    },

    {
      id: 'help',
      icon: '❓',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => navigation.navigate('HelpSupport'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Main', { screen: 'Manage' })}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>
              {userInfo?.name || 'User Name'}
            </Text>
            <Text style={styles.profileEmail}>
              {userInfo?.email || 'user@example.com'}
            </Text>
            
            {storeInfo && (
              <View style={styles.storeInfo}>
                <Text style={styles.storeLabel}>Store:</Text>
                <Text style={styles.storeName}>{storeInfo.name}</Text>
              </View>
            )}
            
            <View style={styles.profilePlan}>
              <Text style={styles.profilePlanText}>
                {getPlanDisplayName()} Plan
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {profileOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity
            style={[styles.optionItem, styles.dangerOption]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>🚪</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.dangerText]}>Sign Out</Text>
                <Text style={styles.optionSubtitle}>Sign out of your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error.main} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>FlowPOS v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️ for small businesses</Text>
        </View>
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
  profileCard: {
    backgroundColor: colors.background.surface,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  profileDetails: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 6,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  profilePlan: {
    backgroundColor: colors.primary.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary.border,
  },
  profilePlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
    textTransform: 'capitalize',
  },
  optionsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  dangerZone: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  optionItem: {
    backgroundColor: colors.background.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dangerOption: {
    borderColor: colors.error.border,
    backgroundColor: colors.error.background,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 30,
    textAlign: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  dangerText: {
    color: colors.error.main,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
});

export default ProfileScreen;