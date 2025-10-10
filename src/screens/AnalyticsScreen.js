import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { typography, createTextStyle, spacing, screenDimensions } from '../utils/typography';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';

const AnalyticsScreen = ({ navigation }) => {
  const [analytics, setAnalytics] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0,
    popularProducts: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  
  // Page loading state
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1200);
  
  // App tour guide
  const { showTour, completeTour } = useAppTour('Analytics');
  
  // No animations needed

  useEffect(() => {
    loadAnalytics();
    const unsubscribe = navigation.addListener('focus', loadAnalytics);
    
    // No animations needed
    
    return unsubscribe;
  }, [navigation]);

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      // No animation delays needed
      // Load revenue data
      const revenueData = await AsyncStorage.getItem('revenue');
      const revenue = revenueData ? JSON.parse(revenueData) : {
        today: 0,
        week: 0,
        total: 0,
        orders: 0,
      };

      // Load products data
      const productsData = await AsyncStorage.getItem('products');
      const products = productsData ? JSON.parse(productsData) : [];

      // Load orders to calculate popular products
      const ordersData = await AsyncStorage.getItem('orders');
      const orders = ordersData ? JSON.parse(ordersData) : [];

      // Calculate popular products
      const productSales = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity;
          } else {
            productSales[item.id] = {
              ...item,
              quantity: item.quantity,
            };
          }
        });
      });

      const popularProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setAnalytics({
        todayRevenue: revenue.today,
        weekRevenue: revenue.week,
        totalRevenue: revenue.total,
        totalOrders: revenue.orders,
        avgOrderValue: revenue.orders > 0 ? Math.round(revenue.total / revenue.orders) : 0,
        totalProducts: products.length,
        popularProducts,
      });

      // Finish loading animation on initial load
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadAnalytics(true);
  };

  const StatCard = ({ title, value, subtitle, color = colors.text.primary, index }) => (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PopularProductItem = ({ product, index }) => (
    <View style={styles.popularProductItem}>
      <View style={styles.productRank}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.productImage}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImageStyle} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productImagePlaceholderText}>📦</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
          {product.name}
        </Text>
        <Text style={styles.productCategory} numberOfLines={1}>
          {product.category || 'General'}
        </Text>
      </View>
      <View style={styles.productStats}>
        <Text style={styles.productPrice}>₹{product.price}</Text>
        <Text style={styles.productSold}>{product.quantity} sold</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading analytics..." />
      
      <View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
              progressBackgroundColor={colors.background.surface}
              title="Pull to refresh analytics..."
              titleColor={colors.text.secondary}
            />
          }
        >
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Revenue"
            value={`₹${analytics.totalRevenue || 0}`}
            subtitle="All time"
            color={colors.primary.main}
            index={0}
          />

          <StatCard
            title="Total Orders"
            value={analytics.totalOrders || 0}
            subtitle="Completed"
            color={colors.success.main}
            index={1}
          />

          <StatCard
            title="Products"
            value={analytics.totalProducts || 0}
            subtitle="In inventory"
            color={colors.warning.main}
            index={2}
          />

          <StatCard
            title="Avg Order"
            value={`₹${analytics.avgOrderValue || 0}`}
            subtitle="Per order"
            color={colors.primary.main}
            index={3}
          />
        </View>

        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.revenueCards}>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>Today</Text>
                <Text style={styles.revenueValue}>₹{analytics.todayRevenue}</Text>
              </View>
            </View>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>This Week</Text>
                <Text style={styles.revenueValue}>₹{analytics.weekRevenue}</Text>
              </View>
            </View>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>All Time</Text>
                <Text style={styles.revenueValue}>₹{analytics.totalRevenue}</Text>
              </View>
            </View>
          </View>
        </View>

        {analytics.popularProducts.length > 0 && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Products</Text>
            {analytics.popularProducts.map((product, index) => (
              <PopularProductItem
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </View>
        )}
        </ScrollView>
      </View>
      </View>

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="Analytics"
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
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  statTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  revenueSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  revenueCards: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  revenueCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  revenueCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  revenueLabel: {
    ...createTextStyle('body1', colors.text.secondary),
  },
  revenueValue: {
    ...createTextStyle('price', colors.text.primary),
  },
  popularSection: {
    marginBottom: 24,
  },
  popularProductItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productImagePlaceholderText: {
    fontSize: 16,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  productStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  productSold: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'right',
  },
});

export default AnalyticsScreen;