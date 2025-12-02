import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import LoadingSpinner from '../../components/LoadingSpinner';

const HelpSupportScreen = ({ navigation }) => {
  const [contactModal, setContactModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'suggestion',
    message: '',
    rating: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      items: [
        'Setting up your store',
        'Adding your first products',
        'Processing your first order',
        'Understanding the dashboard',
        'Basic navigation guide',
      ]
    },
    {
      id: 'orders-payments',
      title: 'Orders & Payments',
      icon: '💳',
      items: [
        'Processing orders',
        'Payment methods setup',
        'UPI payment integration',
        'Managing refunds',
        'Order history and tracking',
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: '📦',
      items: [
        'Adding and editing products',
        'Stock management',
        'Categories and organization',
        'Barcode scanning',
        'Low stock alerts',
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: '📊',
      items: [
        'Understanding sales reports',
        'Viewing analytics dashboard',
        'Exporting data',
        'Setting up automated reports',
        'Performance insights',
      ]
    },
    {
      id: 'account',
      title: 'Account & Settings',
      icon: '⚙️',
      items: [
        'Managing your profile',
        'Subscription and billing',
        'Security settings',
        'Notification preferences',
        'Data backup and sync',
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      items: [
        'App crashes or freezes',
        'Payment issues',
        'Sync problems',
        'Performance optimization',
        'Common error messages',
      ]
    },
  ];

  const quickActions = [
    {
      id: 'contact-support',
      title: 'Contact Support',
      subtitle: 'Get help from our support team',
      icon: 'headset-outline',
      color: colors.primary.main,
      onPress: () => setContactModal(true),
    },
    {
      id: 'live-chat',
      title: 'Live Chat',
      subtitle: 'Chat with support (9 AM - 6 PM)',
      icon: 'chatbubble-outline',
      color: colors.success.main,
      onPress: () => Alert.alert('Live Chat', 'Live chat feature coming soon!'),
    },
    {
      id: 'video-call',
      title: 'Video Support',
      subtitle: 'Schedule a video call with expert',
      icon: 'videocam-outline',
      color: colors.info.main,
      onPress: () => Alert.alert('Video Support', 'Video support feature coming soon!'),
    },
    {
      id: 'community',
      title: 'Community Forum',
      subtitle: 'Connect with other FlowPOS users',
      icon: 'people-outline',
      color: colors.warning.main,
      onPress: () => Alert.alert('Community', 'Community forum feature coming soon!'),
    },
  ];

  const handleContactSubmit = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual contact form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setContactModal(false);
      setContactForm({ subject: '', message: '', priority: 'medium' });
      Alert.alert('Success', 'Your message has been sent. We\'ll get back to you soon!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackForm.message.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual feedback submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFeedbackModal(false);
      setFeedbackForm({ type: 'suggestion', message: '', rating: 5 });
      Alert.alert('Success', 'Thank you for your feedback!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openExternalLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open link');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => setFeedbackModal(true)}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Help Topics</Text>
          {helpCategories.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => Alert.alert(category.title, 'Help articles feature coming soon!')}
              >
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <View style={styles.categoryItems}>
                {category.items.slice(0, 3).map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => Alert.alert('Help Article', `"${item}" article coming soon!`)}
                  >
                    <Text style={styles.categoryItemText}>• {item}</Text>
                  </TouchableOpacity>
                ))}
                {category.items.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => Alert.alert(category.title, 'All articles feature coming soon!')}
                  >
                    <Text style={styles.viewAllText}>View all {category.items.length} articles</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Alert.alert('Video Tutorials', 'Video tutorials feature coming soon!')}
          >
            <Ionicons name="play-circle-outline" size={24} color={colors.text.primary} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Video Tutorials</Text>
              <Text style={styles.resourceSubtitle}>Step-by-step video guides</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Alert.alert('User Manual', 'User manual feature coming soon!')}
          >
            <Ionicons name="book-outline" size={24} color={colors.text.primary} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>User Manual</Text>
              <Text style={styles.resourceSubtitle}>Complete FlowPOS guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => openExternalLink('https://flowpos.com/blog')}
          >
            <Ionicons name="newspaper-outline" size={24} color={colors.text.primary} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Blog & Tips</Text>
              <Text style={styles.resourceSubtitle}>Latest updates and business tips</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => Alert.alert('FAQ', 'FAQ feature coming soon!')}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.text.primary} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Frequently Asked Questions</Text>
              <Text style={styles.resourceSubtitle}>Quick answers to common questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.contactText}>support@flowpos.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.contactText}>+91 1800-123-4567</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.contactText}>Mon-Fri, 9 AM - 6 PM IST</Text>
            </View>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.appInfoCard}>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Version</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Build</Text>
              <Text style={styles.appInfoValue}>2024.01.15</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Platform</Text>
              <Text style={styles.appInfoValue}>React Native</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Contact Support Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={contactModal}
        onRequestClose={() => setContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setContactModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Brief description of your issue"
                  value={contactForm.subject}
                  onChangeText={(text) => setContactForm({...contactForm, subject: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {['low', 'medium', 'high'].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        contactForm.priority === priority && styles.priorityButtonActive
                      ]}
                      onPress={() => setContactForm({...contactForm, priority})}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        contactForm.priority === priority && styles.priorityButtonTextActive
                      ]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your issue in detail..."
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm({...contactForm, message: text})}
                  multiline={true}
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleContactSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoadingSpinner size="small" color={colors.background.surface} />
                ) : (
                  <Text style={styles.submitButtonText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModal}
        onRequestClose={() => setFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Feedback</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFeedbackModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Feedback Type</Text>
                <View style={styles.priorityButtons}>
                  {[
                    { key: 'suggestion', label: 'Suggestion' },
                    { key: 'bug', label: 'Bug Report' },
                    { key: 'compliment', label: 'Compliment' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.priorityButton,
                        feedbackForm.type === type.key && styles.priorityButtonActive
                      ]}
                      onPress={() => setFeedbackForm({...feedbackForm, type: type.key})}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        feedbackForm.type === type.key && styles.priorityButtonTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rating</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setFeedbackForm({...feedbackForm, rating: star})}
                    >
                      <Ionicons
                        name={star <= feedbackForm.rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= feedbackForm.rating ? colors.warning.main : colors.text.secondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Feedback *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us what you think..."
                  value={feedbackForm.message}
                  onChangeText={(text) => setFeedbackForm({...feedbackForm, message: text})}
                  multiline={true}
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleFeedbackSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoadingSpinner size="small" color={colors.background.surface} />
                ) : (
                  <Text style={styles.submitButtonText}>Send Feedback</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  feedbackButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  categoryItems: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryItem: {
    paddingVertical: 4,
  },
  categoryItemText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  viewAllButton: {
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resourceContent: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  resourceSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  contactCard: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
  },
  appInfoCard: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appInfoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  priorityButtonText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  priorityButtonTextActive: {
    color: colors.background.surface,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
});

export default HelpSupportScreen;