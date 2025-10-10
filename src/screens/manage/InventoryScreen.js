import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';

const InventoryScreen = () => {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low_stock, out_of_stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadProducts(true);
  };

  const updateStock = async (productId, newStockValue) => {
    try {
      const updatedProducts = products.map(product =>
        product.id === productId
          ? { ...product, stock: parseInt(newStockValue) }
          : product
      );
      
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Stock updated successfully');
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock');
    }
  };

  const handleStockUpdate = () => {
    if (!newStock || isNaN(parseInt(newStock)) || parseInt(newStock) < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid stock quantity');
      return;
    }

    updateStock(selectedProduct.id, newStock);
    setShowStockModal(false);
    setSelectedProduct(null);
    setNewStock('');
  };

  const getFilteredProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock filter
    switch (filterType) {
      case 'low_stock':
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= 5);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.stock === 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Out of Stock', color: colors.error.main, bg: '#fee2e2' };
    if (stock <= 5) return { text: 'Low Stock', color: '#f59e0b', bg: '#fef3c7' };
    return { text: 'In Stock', color: colors.success.main, bg: '#d1fae5' };
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.stock);

    return (
      <View style={styles.productCard}>
        <View style={styles.productEmoji}>
          <Text style={styles.emojiText}>{item.emoji}</Text>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{item.price}</Text>
        </View>

        <View style={styles.stockInfo}>
          <Text style={styles.stockQuantity}>{item.stock}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => {
              setSelectedProduct(item);
              setNewStock(item.stock.toString());
              setShowStockModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterButton = (type, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.filterButtonActive
      ]}
      onPress={() => setFilterType(type)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || filterType !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Add products to start managing inventory'
        }
      </Text>
    </View>
  );

  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All Items')}
        {renderFilterButton('low_stock', 'Low Stock')}
        {renderFilterButton('out_of_stock', 'Out of Stock')}
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
        />
      )}

      {/* Stock Update Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showStockModal}
        onRequestClose={() => setShowStockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stock</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowStockModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View style={styles.productPreview}>
                <Text style={styles.productPreviewEmoji}>{selectedProduct.emoji}</Text>
                <Text style={styles.productPreviewName}>{selectedProduct.name}</Text>
                <Text style={styles.currentStock}>Current Stock: {selectedProduct.stock}</Text>
              </View>
            )}

            <TextInput
              style={styles.stockInput}
              placeholder="Enter new stock quantity"
              value={newStock}
              onChangeText={setNewStock}
              keyboardType="numeric"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStockModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleStockUpdate}
              >
                <Text style={styles.saveButtonText}>Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInput: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.background.surface,
  },
  productsList: {
    padding: 20,
  },
  productCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiText: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  stockInfo: {
    alignItems: 'center',
    minWidth: 80,
  },
  stockQuantity: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.surface,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  productPreview: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  productPreviewEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  productPreviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  stockInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.success.main,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
});

export default InventoryScreen;