import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../styles/colors';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
import PerformanceInsightsService from '../services/PerformanceInsightsService';
import Icon from '../components/SVGIcons';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';

const PerformanceInsightsScreen = ({ navigation }) => {
  const [insightsData, setInsightsData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1000);
  
  // App tour guide
  const { showTour, completeTour } = useAppTour('PerformanceInsights');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      console.log('📊 [PerformanceInsights] Loading insights...');
      const data = await PerformanceInsightsService.getAllInsights();
      setInsightsData(data);
      
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading performance insights:', error);
      Alert.alert('Error', 'Failed to load performance insights');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadInsights(true);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return colors.success.main;
    if (score >= 60) return colors.warning.main;
    return colors.error.main;
  };

  const getHealthScoreIcon = (status) => {
    switch (status) {
      case 'excellent': return 'trophy';
      case 'good': return 'thumbs-up';
      case 'fair': return 'warning';
      case 'poor': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getChangeIcon = (change) => {
    if (change > 0) return 'trending-up';
    if (change < 0) return 'trending-down';
    return 'remove';
  };

  const getChangeColor = (change) => {
    if (change > 0) return colors.success.main;
    if (change < 0) return colors.error.main;
    return colors.text.secondary;
  };

  const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString()}`;

  const formatChange = (change) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'success': return colors.success.main;
      case 'warning': return colors.warning.main;
      case 'error': return colors.error.main;
      default: return colors.primary.main;
    }
  };

  const renderHealthScoreCard = () => {
    if (!insightsData?.healthScore) return null;

    const { score, status, message } = insightsData.healthScore;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Ionicons 
              name={getHealthScoreIcon(status)} 
              size={24} 
              color={getHealthScoreColor(score)} 
            />
            <Text style={styles.cardTitle}>Business Health</Text>
          </View>
        </View>
        
        <View style={styles.healthScoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreText, { color: getHealthScoreColor(score) }]}>
              {score}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          
          <View style={styles.scoreDetails}>
            <Text style={[styles.scoreStatus, { color: getHealthScoreColor(score) }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)} Performance
            </Text>
            <Text style={styles.scoreMessage}>{message}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMonthlyComparisonCard = () => {
    if (!insightsData?.monthlyComparison) return null;

    const { currentMonth, changes } = insightsData.monthlyComparison;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Ionicons name="calendar" size={24} color={colors.primary.main} />
            <Text style={styles.cardTitle}>This Month vs Last Month</Text>
          </View>
        </View>
        
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonLabel}>Revenue</Text>
              <View style={styles.changeContainer}>
                <Ionicons 
                  name={getChangeIcon(changes.revenue)} 
                  size={16} 
                  color={getChangeColor(changes.revenue)} 
                />
                <Text style={[styles.changeText, { color: getChangeColor(changes.revenue) }]}>
                  {formatChange(changes.revenue)}
                </Text>
              </View>
            </View>
            <Text style={styles.comparisonValue}>
              {formatCurrency(currentMonth.revenue)}
            </Text>
          </View>

          <View style={styles.comparisonItem}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonLabel}>Orders</Text>
              <View style={styles.changeContainer}>
                <Ionicons 
                  name={getChangeIcon(changes.orders)} 
                  size={16} 
                  color={getChangeColor(changes.orders)} 
                />
                <Text style={[styles.changeText, { color: getChangeColor(changes.orders) }]}>
                  {formatChange(changes.orders)}
                </Text>
              </View>
            </View>
            <Text style={styles.comparisonValue}>
              {currentMonth.orders}
            </Text>
          </View>

          <View style={styles.comparisonItem}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonLabel}>Items Sold</Text>
              <View style={styles.changeContainer}>
                <Ionicons 
                  name={getChangeIcon(changes.items)} 
                  size={16} 
                  color={getChangeColor(changes.items)} 
                />
                <Text style={[styles.changeText, { color: getChangeColor(changes.items) }]}>
                  {formatChange(changes.items)}
                </Text>
              </View>
            </View>
            <Text style={styles.comparisonValue}>
              {currentMonth.items}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInsightsCard = () => {
    if (!insightsData?.insights || insightsData.insights.length === 0) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Ionicons name="bulb" size={24} color={colors.warning.main} />
            <Text style={styles.cardTitle}>Key Insights</Text>
          </View>
        </View>
        
        <View style={styles.insightsContainer}>
          {insightsData.insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <View style={styles.insightIconContainer}>
                <Icon 
                  name={insight.icon} 
                  size={18} 
                  color={colors.primary.main} 
                />
              </View>
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading insights..." />
      
      <View style={[styles.content, contentStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Performance Insights</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
            />
          }
        >
          {renderHealthScoreCard()}
          {renderMonthlyComparisonCard()}
          {renderInsightsCard()}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Data updated: {insightsData?.generatedAt ? 
                new Date(insightsData.generatedAt).toLocaleString() : 
                'Never'
              }
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="PerformanceInsights"
        onComplete={completeTour}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border.light,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: -4,
  },
  scoreDetails: {
    flex: 1,
  },
  scoreStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  comparisonContainer: {
    gap: 16,
  },
  comparisonItem: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  insightsContainer: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  insightText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

export default PerformanceInsightsScreen;