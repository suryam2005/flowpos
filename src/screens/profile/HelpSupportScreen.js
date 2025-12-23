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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import { useAuth } from '../../context/AuthContext';

const HelpSupportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [contactModal, setContactModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
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

  // FAQ Data with actual answers
  const faqData = [
    {
      id: 'add-products',
      question: 'How do I add products?',
      answer: 'Go to Manage screen → Products tab → Tap "Add Product" button. Fill in product name, price, stock quantity, and optionally add an image and tags. Products with stock tracking will show low stock alerts.',
    },
    {
      id: 'process-order',
      question: 'How do I process an order?',
      answer: 'From the POS screen, tap products to add them to cart. Tap "Complete Order" to go to checkout. Enter customer details, select payment method (Cash, Card, or QR Pay), then tap "Complete Order" to finish.',
    },
    {
      id: 'qr-payment',
      question: 'How do I set up QR payments?',
      answer: 'Go to Manage → Store Settings → scroll to UPI Settings. Add your UPI ID (e.g., yourname@upi). You can add up to 3 UPI IDs. When processing orders, select "QR Pay" to generate a payment QR code.',
    },
    {
      id: 'view-reports',
      question: 'How do I view sales reports?',
      answer: 'Go to Analytics screen from the bottom navigation. You can see daily, weekly, and monthly sales. For detailed reports, go to Settings → PDF Reports or Data Export to generate comprehensive business reports.',
    },
    {
      id: 'manage-inventory',
      question: 'How do I manage inventory?',
      answer: 'Go to Manage → Inventory tab. Here you can update stock quantities, enable/disable stock tracking for products, and see low stock alerts. Products with tracking enabled will prevent overselling.',
    },
    {
      id: 'whatsapp-invoice',
      question: 'How do I send invoices via WhatsApp?',
      answer: 'After completing an order, you can share the invoice. For automatic WhatsApp sending, go to Settings → WhatsApp Setup and configure your Twilio credentials. Invoices will be sent automatically to customers with phone numbers.',
    },
    {
      id: 'change-store-info',
      question: 'How do I update store information?',
      answer: 'Go to Manage → Store Settings tab. Here you can update store name, address, phone, email, GST number, business type, and UPI IDs. Changes are saved automatically.',
    },
    {
      id: 'export-data',
      question: 'How do I export my data?',
      answer: 'Go to Settings → Data Export. You can export products, orders, sales summary, or complete business reports in CSV format. For PDF reports, use Settings → PDF Reports.',
    },
  ];

  // Quick Actions
  const quickActions = [
    {
      id: 'contact-support',
      title: 'Contact Support',
      subtitle: 'Send us a message',
      icon: 'mail-outline',
      color: colors.primary.main,
      onPress: () => setContactModal(true),
    },
    {
      id: 'send-feedback',
      title: 'Send Feedback',
      subtitle: 'Help us improve',
      icon: 'chatbubble-outline',
      color: colors.success.main,
      onPress: () => setFeedbackModal(true),
    },
  ];

  // Coming Soon Features
  const comingSoonFeatures = [
    { title: 'Video Tutorials', icon: 'play-circle-outline' },
    { title: 'Live Chat Support', icon: 'chatbubbles-outline' },
    { title: 'Community Forum', icon: 'people-outline' },
  ];

  const handleContactSubmit = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Save support request locally
      const supportRequests = await AsyncStorage.getItem('supportRequests');
      const requests = supportRequests ? JSON.parse(supportRequests) : [];
      
      const newRequest = {
        id: `SR_${Date.now()}`,
        type: 'support',
        subject: contactForm.subject,
        message: contactForm.message,
        priority: contactForm.priority,
        userEmail: user?.email || 'Unknown',
        userId: user?.id || 'Unknown',
        timestamp: new Date().toISOString(),
        status: 'pending',
      };
      
      requests.push(newRequest);
      await AsyncStorage.setItem('supportRequests', JSON.stringify(requests));
      
      setContactModal(false);
      setContactForm({ subject: '', message: '', priority: 'medium' });
      
      Alert.alert(
        'Message Sent',
        'Your support request has been saved. Our team will review it and get back to you via email.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting support request:', error);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Save feedback locally
      const feedbackData = await AsyncStorage.getItem('userFeedback');
      const feedbacks = feedbackData ? JSON.parse(feedbackData) : [];
      
      const newFeedback = {
        id: `FB_${Date.now()}`,
        type: feedbackForm.type,
        message: feedbackForm.message,
        rating: feedbackForm.rating,
        userEmail: user?.email || 'Unknown',
        userId: user?.id || 'Unknown',
        timestamp: new Date().toISOString(),
      };
      
      feedbacks.push(newFeedback);
      await AsyncStorage.setItem('userFeedback', JSON.stringify(feedbacks));
      
      setFeedbackModal(false);
      setFeedbackForm({ type: 'suggestion', message: '', rating: 5 });
      
      Alert.alert(
        'Thank You!',
        'Your feedback has been recorded. We appreciate you helping us improve FlowPOS!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  // Coming Soon Badge
  const ComingSoonBadge = () => (
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonText}>Coming Soon</Text>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          <View style={styles.quickActionsRow}>
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

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqData.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFaq(faq.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Coming Soon Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Resources</Text>
          {comingSoonFeatures.map((feature, index) => (
            <View key={index} style={styles.comingSoonItem}>
              <Ionicons name={feature.icon} size={24} color={colors.text.secondary} />
              <Text style={styles.comingSoonItemText}>{feature.title}</Text>
              <ComingSoonBadge />
            </View>
          ))}
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
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.contactText}>Response within 24-48 hours</Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfoCard}>
            <Text style={styles.appInfoTitle}>FlowPOS</Text>
            <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
            <Text style={styles.appInfoTagline}>Made with ❤️ for small businesses</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
              <TouchableOpacity onPress={() => setContactModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Brief description of your issue"
                  placeholderTextColor={colors.text.tertiary}
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
                  placeholderTextColor={colors.text.tertiary}
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
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Text>
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
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
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
                  placeholderTextColor={colors.text.tertiary}
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
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </Text>
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
  headerSpacer: {
    width: 40,
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
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  faqItem: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    opacity: 0.7,
  },
  comingSoonItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 12,
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
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  appInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  appInfoTagline: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  bottomPadding: {
    height: 40,
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
    maxHeight: '85%',
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
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
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
