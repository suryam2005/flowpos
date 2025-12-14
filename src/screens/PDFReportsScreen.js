import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import pdfReportsService from '../services/PDFReportsService';
import Icon from '../components/SVGIcons';

const PDFReportsScreen = ({ navigation }) => {
  const [reportTypes, setReportTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState(null);

  useEffect(() => {
    loadReportTypes();
  }, []);

  const loadReportTypes = async () => {
    try {
      const types = pdfReportsService.getAvailableReportTypes();
      setReportTypes(types);
    } catch (error) {
      console.error('Error loading report types:', error);
      Alert.alert('Error', 'Failed to load report options');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType) => {
    try {
      setGenerating(true);
      setGeneratingType(reportType.id);
      
      Alert.alert(
        'Generate PDF Report',
        `Generate ${reportType.name}? This will create a professional PDF report with your business data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate', onPress: () => performGeneration(reportType) }
        ]
      );
    } catch (error) {
      console.error('Error starting report generation:', error);
      Alert.alert('Error', 'Failed to start report generation');
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const performGeneration = async (reportType) => {
    try {
      setGenerating(true);
      setGeneratingType(reportType.id);
      
      console.log('🚀 [PDF Reports] Starting generation for:', reportType.name);
      
      let result;
      const options = {};

      // Add period selection for sales report
      if (reportType.id === 'sales_report') {
        options.period = 'all'; // Default to all time, could be made configurable
      }

      result = await pdfReportsService.generateReport(reportType.id, options);

      console.log('✅ [PDF Reports] Report generated:', {
        filename: result.filename,
        type: result.type
      });

      // Show preview and share options
      Alert.alert(
        'Report Generated!',
        `${reportType.name} has been generated successfully!\n\nFile: ${result.filename}\n\nWould you like to share it now?`,
        [
          { text: 'Save Only', style: 'cancel' },
          { 
            text: 'Share Report', 
            onPress: async () => {
              try {
                await pdfReportsService.shareReport(result);
                Alert.alert(
                  'Report Shared!',
                  `${reportType.name} has been shared successfully. You can save it to files or send via email/messaging apps.`
                );
              } catch (shareError) {
                console.error('Share error:', shareError);
                Alert.alert('Share Failed', 'Could not share the PDF report. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [PDF Reports] Generation error:', error);
      Alert.alert(
        'Generation Failed',
        `Failed to generate ${reportType.name}.\n\nError: ${error.message}\n\nPlease ensure you have business data and try again.`
      );
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const renderReportType = (reportType) => {
    const isGenerating = generating && generatingType === reportType.id;

    return (
      <View key={reportType.id} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportInfo}>
            <View style={styles.reportTitleRow}>
              <Ionicons 
                name={reportType.icon} 
                size={24} 
                color={colors.primary.main} 
              />
              <Text style={styles.reportTitle}>
                {reportType.name}
              </Text>
            </View>
            <Text style={styles.reportDescription}>
              {reportType.description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generatingButton]}
          onPress={() => !isGenerating ? handleGenerateReport(reportType) : null}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={colors.background.surface} />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color={colors.background.surface} 
              />
              <Text style={styles.generateButtonText}>
                Generate PDF
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading report options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>PDF Reports</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary.main} />
          <Text style={styles.infoText}>
            Generate professional PDF reports for your business analysis, accounting, and record-keeping needs.
          </Text>
        </View>

        {reportTypes.map(renderReportType)}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>About PDF Reports</Text>
          <Text style={styles.helpText}>
            • Professional PDF reports with charts and analytics{'\n'}
            • Perfect for business analysis and record-keeping{'\n'}
            • Share via email, messaging apps, or save to device{'\n'}
            • All reports include your store branding and information{'\n'}
            • Reports are generated locally on your device for privacy
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Report Features</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.featureText}>Professional formatting and layout</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.featureText}>Comprehensive business metrics</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.featureText}>Store branding and information</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.featureText}>Easy sharing and distribution</Text>
            </View>
          </View>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.primary.main,
    lineHeight: 20,
  },
  reportCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    marginBottom: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  reportDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingButton: {
    backgroundColor: colors.text.disabled,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
    marginLeft: 8,
  },
  helpSection: {
    backgroundColor: colors.background.surface,
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  featuresSection: {
    backgroundColor: colors.background.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
});

export default PDFReportsScreen;