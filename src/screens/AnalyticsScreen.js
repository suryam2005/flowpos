import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { fadeIn, staggerAnimation } from '../utils/animations';
import { typography, createTextStyle, spacing, screenDimensions } from '../utils/typography';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';

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
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(4)].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    loadAnalytics();
    const unsubscribe = navigation.addListener('focus', loadAnalytics);
    
    // Animate on mount
    fadeIn(fadeAnim, 500).start();
    
    return unsubscribe;
  }, [navigation]);

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      // Add slight delay for smooth refresh animation
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
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
        
        // Animate stat cards on initial load
        setTimeout(() => {
          const animations = cardAnims.map(anim => 
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            })
          );
          staggerAnimation(animations, 150).start();
        }, 300);
      }

      // Animate stat cards with stagger effect on refresh
      if (isRefresh) {
        const animations = cardAnims.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        );
        staggerAnimation(animations, 100).start();
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
    // Reset animations
    cardAnims.forEach(anim => anim.setValue(0));
    loadAnalytics(true);
  };

  const StatCard = ({ title, value, subtitle, color = '#1f2937', index }) => (
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
      <View style={styles.productEmoji}>
        <Text style={styles.emojiText}>{product.emoji}</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCategory}>{product.category}</Text>
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
      
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
              progressBackgroundColor="#ffffff"
              title="Pull to refresh analytics..."
              titleColor="#6b7280"
            />
          }
        >
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Revenue"
            value={`₹${analytics.totalRevenue || 0}`}
            subtitle="All time"
            color="#2563eb"
            index={0}
          />

          <StatCard
            title="Total Orders"
            value={analytics.totalOrders || 0}
            subtitle="Completed"
            color="#10b981"
            index={1}
          />

          <StatCard
            title="Products"
            value={analytics.totalProducts || 0}
            subtitle="In inventory"
            color="#f59e0b"
            index={2}
          />

          <StatCard
            title="Avg Order"
            value={`₹${analytics.avgOrderValue || 0}`}
            subtitle="Per order"
            color="#8b5cf6"
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
      </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    paddingTop: 60, // Proper space for status bar like YouTube app
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
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
    backgroundColor: '#ffffff',
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
    borderColor: '#f3f4f6',
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  revenueSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  revenueCards: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  revenueCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    ...createTextStyle('body1', '#6b7280'),
  },
  revenueValue: {
    ...createTextStyle('price', '#1f2937'),
  },
  popularSection: {
    marginBottom: 24,
  },
  popularProductItem: {
    backgroundColor: '#ffffff',
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
    borderColor: '#f3f4f6',
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  productEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  productSold: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default AnalyticsScreen;