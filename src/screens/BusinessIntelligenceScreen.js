import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../styles/colors';

const BusinessIntelligenceScreen = ({ navigation }) => {
  const [businessData, setBusinessData] = useState({
    products: [],
    orders: [],
    revenue: { today: 0, week: 0, total: 0, orders: 0 },
    storeInfo: null,
  });
  const [analytics, setAnalytics] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, all

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const [productsData, ordersData, revenueData, storeInfoData] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('revenue'),
        AsyncStorage.getItem('storeInfo'),
      ]);

      const products = productsData ? JSON.parse(productsData) : [];
      const orders = ordersData ? JSON.parse(ordersData) : [];
      const revenue = revenueData ? JSON.parse(revenueData) : { today: 0, week: 0, total: 0, orders: 0 };
      const storeInfo = storeInfoData ? JSON.parse(storeInfoData) : null;

      setBusinessData({ products, orders, revenue, storeInfo });
      calculateAdvancedAnalytics({ products, orders, revenue });
    } catch (error) {
      console.error('Error loading business data:', error);
      Alert.alert('Error', 'Failed to load business intelligence data.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const calculateAdvancedAnalytics = ({ products, orders, revenue }) => {
    // Revenue Analytics
    const totalRevenue = revenue.total || 0;
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Product Performance
    const productSales = {};
    const productRevenue = {};
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        const productName = item.name;
        productSales[productName] = (productSales[productName] || 0) + item.quantity;
        productRevenue[productName] = (productRevenue[productName] || 0) + (item.price * item.quantity);
      });
    });

    const topSellingProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity, revenue: productRevenue[name] || 0 }));

    const topRevenueProducts = Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue, quantity: productSales[name] || 0 }));

    // Time-based Analytics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weekOrders = orders.filter(order => new Date(order.timestamp) >= weekAgo);
    const monthOrders = orders.filter(order => new Date(order.timestamp) >= monthAgo);

    const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Growth Calculations
    const previousWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return orderDate >= twoWeeksAgo && orderDate < weekAgo;
    });

    const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueGrowth = previousWeekRevenue > 0 
      ? Math.round(((weekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100)
      : weekRevenue > 0 ? 100 : 0;

    // Inventory Analytics
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.trackStock && p.stock < 5);
    const outOfStockProducts = products.filter(p => p.trackStock && p.stock === 0);
    const highValueProducts = products.filter(p => p.price > 500);

    // Customer Analytics (based on orders)
    const uniqueCustomers = new Set(orders.map(order => order.customerPhone || order.customerName).filter(Boolean));
    const repeatCustomers = orders.reduce((acc, order) => {
      const customer = order.customerPhone || order.customerName;
      if (customer) {
    