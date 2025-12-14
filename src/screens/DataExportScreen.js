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
import csvExportService from '../services/CSVExportService';
import Icon from '../components/SVGIcons';

const DataExportScreen = ({ navigation }) => {
  const [exportTypes, setExportTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadExportTypes();
  }, []);

  const loadExportTypes = async () => {
    try {
      const types = await csvExportService.getAvailableExportTypes();
      setExportTypes(types);
    } catch (error) {
      console.error('Error loading export types:', error);
      Alert.alert('Error', 'Failed to load export options');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportType) => {
    try {
      setExporting(true);
      
      Alert.alert(
        'Export Data',
        `Export ${exportType.name}? This will generate a CSV file with your business data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Export', onPress: () => performExport(exportType) }
        ]
      );
    } catch (error) {
      console.error('Error starting export:', error);
      Alert.alert('Error', 'Failed to start export process');
    } finally {
      setExporting(false);
    }
  };

  const performExport = async (exportType) => {
    try {
      setExporting(true);
      
      console.log('🚀 [DataExport] Starting export for:', exportType.name);
      
      let result;

      switch (exportType.id) {
        case 'products':
          result = await csvExportService.exportProducts();
          break;
        case 'orders':
          result = await csvExportService.exportOrders();
          break;
        case 'sales_summary':
          result = await csvExportService.exportSalesSummary('all');
          break;
        case 'business_report':
          result = await csvExportService.exportBusinessReport();
          break;
        case 'advanced_analytics':
          result = await csvExportService.exportAdvancedAnalytics();
          break;
        case 'inventory_report':
          result = await csvExportService.exportInventoryReport();
          break;
        default:
          throw new Error('Unknown export type');
      }

      console.log('✅ [DataExport] Export completed:', {
        filename: result.filename,
        recordCount: result.recordCount,
        contentLength: result.content?.length || 0
      });

      // Show CSV preview before sharing
      const previewContent = result.content.length > 200 
        ? result.content.substring(0, 200) + '...\n\n[Content truncated for preview]'
        : result.content;

      Alert.alert(
        'Export Ready',
        `${exportType.name} export completed!\n\nFile: ${result.filename}\nRecords: ${result.recordCount}\nSize: ${result.content.length} characters\n\nPreview:\n${previewContent}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Share CSV', 
            onPress: async () => {
              try {
                await csvExportService.shareCSV(result);
                Alert.alert(
                  'Export Shared!',
                  `${exportType.name} has been shared successfully. You can save it to files or send via email/messaging apps.`
                );
              } catch (shareError) {
                console.error('Share error:', shareError);
                Alert.alert('Share Failed', 'Could not share the CSV file. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [DataExport] Export error:', error);
      Alert.alert(
        'Export Failed',
        `Failed to export ${exportType.name}.\n\nError: ${error.message}\n\nPlease ensure you have data to export and try again.`
      );
    } finally {
      setExporting(false);
    }
  };

  const renderExportType = (exportType) => {
    const isAvailable = exportType.available;

    return (
      <View key={exportType.id} style={[styles.exportCard, !isAvailable && styles.disabledCard]}>
        <View style={styles.exportHeader}>
          <View style={styles.exportInfo}>
            <View style={styles.exportTitleRow}>
              <Ionicons 
                name={exportType.icon} 
                size={24} 
                color={isAvailable ? colors.primary.main : colors.text.disabled} 
              />
              <Text style={[styles.exportTitle, !isAvailable && styles.disabledText]}>
                {exportType.name}
              </Text>
            </View>
            <Text style={[styles.exportDescription, !isAvailable && styles.disabledText]}>
              {exportType.description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, !isAvailable && styles.disabledButton]}
          onPress={() => isAvailable ? handleExport(exportType) : null}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.background.surface} />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons 
                name="download-outline" 
                size={20} 
                color={colors.background.surface} 
              />
              <Text style={styles.exportButtonText}>
                Export CSV
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
          <Text style={styles.loadingText}>Loading export options...</Text>
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
        <Text style={styles.title}>Data Export</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary.main} />
          <Text style={styles.infoText}>
            Export your business data in CSV format for use in Excel, accounting software, or data analysis tools.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={async () => {
            try {
              setLoading(true);
              console.log('🔄 [DataExport] Refreshing data from backend...');
              
              // Import the data sync services
              const productsService = require('../services/ProductsService').default;
              const ordersService = require('../services/OrdersService').default;
              
              // Force refresh both products and orders
              const [products, orders] = await Promise.all([
                productsService.getProducts(),
                ordersService.getOrders()
              ]);
              
              console.log('✅ [DataExport] Refreshed products:', products.length);
              console.log('✅ [DataExport] Refreshed orders:', orders.length);
              
              Alert.alert(
                'Data Refreshed!',
                `Successfully refreshed data from backend:\n\n• Products: ${products.length}\n• Orders: ${orders.length}\n\nYou can now export the latest data.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('❌ [DataExport] Refresh error:', error);
              Alert.alert(
                'Refresh Failed', 
                `Could not refresh data from backend.\n\nError: ${error.message}\n\nPlease check your internet connection and try again.`
              );
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <View style={styles.refreshButtonContent}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary.main} />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </View>
        </TouchableOpacity>

        {exportTypes.map(renderExportType)}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • CSV files can be opened in Excel, Google Sheets, or any spreadsheet application{'\n'}
            • Files include headers for easy data analysis{'\n'}
            • All exports are generated locally on your device{'\n'}
            • Use the share option to save or email your data
          </Text>
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
  exportCard: {
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
  disabledCard: {
    opacity: 0.6,
  },
  exportHeader: {
    marginBottom: 16,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  exportDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  disabledText: {
    color: colors.text.disabled,
  },
  exportButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButtonText: {
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
    marginBottom: 40,
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
  refreshButton: {
    backgroundColor: colors.primary.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  refreshButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
    marginLeft: 8,
  },
});

export default DataExportScreen;