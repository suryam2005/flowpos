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

const MaterialsScreen = () => {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('materials'); // materials, suppliers, orders
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('material'); // material, supplier
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    costPerUnit: '',
    currentStock: '',
    minStock: '',
    supplier: '',
    description: '',
  });

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    materials: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const [materialsData, suppliersData] = await Promise.all([
        AsyncStorage.getItem('materials'),
        AsyncStorage.getItem('suppliers'),
      ]);

      if (materialsData) {
        setMaterials(JSON.parse(materialsData));
      }
      if (suppliersData) {
        setSuppliers(JSON.parse(suppliersData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  const saveMaterial = async () => {
    if (!formData.name.trim() || !formData.costPerUnit) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const newMaterial = {
        id: Date.now().toString(),
        ...formData,
        costPerUnit: parseFloat(formData.costPerUnit),
        currentStock: parseInt(formData.currentStock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        createdAt: new Date().toISOString(),
      };

      const updatedMaterials = [...materials, newMaterial];
      await AsyncStorage.setItem('materials', JSON.stringify(updatedMaterials));
      setMaterials(updatedMaterials);

      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Material added successfully');
    } catch (error) {
      console.error('Error saving material:', error);
      Alert.alert('Error', 'Failed to save material');
    }
  };

  const saveSupplier = async () => {
    if (!supplierFormData.name.trim() || !supplierFormData.contact) {
      Alert.alert('Error', 'Please fill in name and contact');
      return;
    }

    try {
      const newSupplier = {
        id: Date.now().toString(),
        ...supplierFormData,
        createdAt: new Date().toISOString(),
      };

      const updatedSuppliers = [...suppliers, newSupplier];
      await AsyncStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      setSuppliers(updatedSuppliers);

      setShowAddModal(false);
      resetSupplierForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Supplier added successfully');
    } catch (error) {
      console.error('Error saving supplier:', error);
      Alert.alert('Error', 'Failed to save supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      unit: '',
      costPerUnit: '',
      currentStock: '',
      minStock: '',
      supplier: '',
      description: '',
    });
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      contact: '',
      email: '',
      address: '',
      materials: [],
    });
  };

  const handleAddMaterial = () => {
    setModalType('material');
    resetForm();
    setShowAddModal(true);
  };

  const handleAddSupplier = () => {
    setModalType('supplier');
    resetSupplierForm();
    setShowAddModal(true);
  };

  const getStockStatus = (current, min) => {
    if (current === 0) return { text: 'Out of Stock', color: colors.error.main, bg: '#fee2e2' };
    if (current <= min) return { text: 'Low Stock', color: '#f59e0b', bg: '#fef3c7' };
    return { text: 'In Stock', color: colors.success.main, bg: '#d1fae5' };
  };

  const renderMaterial = ({ item }) => {
    const status = getStockStatus(item.currentStock, item.minStock);
    const supplier = suppliers.find(s => s.id === item.supplier);

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemInfo}>
            Stock: {item.currentStock} {item.unit} (Min: {item.minStock})
          </Text>
          <Text style={styles.itemInfo}>
            Cost: ₹{item.costPerUnit}/{item.unit}
          </Text>
          {supplier && (
            <Text style={styles.itemInfo}>Supplier: {supplier.name}</Text>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Reorder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSupplier = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemInfo}>Contact: {item.contact}</Text>
        {item.email && <Text style={styles.itemInfo}>Email: {item.email}</Text>}
        {item.address && <Text style={styles.itemInfo}>Address: {item.address}</Text>}
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabButton = (tab, label) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.tabButtonActive
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.tabButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {type === 'materials' ? '📦' : '🏢'}
      </Text>
      <Text style={styles.emptyTitle}>
        No {type === 'materials' ? 'Materials' : 'Suppliers'} Added
      </Text>
      <Text style={styles.emptyText}>
        Add your first {type === 'materials' ? 'material' : 'supplier'} to start managing your supply chain
      </Text>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={activeTab === 'materials' ? handleAddMaterial : handleAddSupplier}
      activeOpacity={0.8}
    >
      <Text style={styles.addButtonText}>
        + Add {activeTab === 'materials' ? 'Material' : 'Supplier'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {renderTabButton('materials', 'Materials')}
        {renderTabButton('suppliers', 'Suppliers')}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'materials' ? (
          materials.length === 0 ? (
            renderEmptyState('materials')
          ) : (
            <FlatList
              data={materials}
              renderItem={renderMaterial}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
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
          )
        ) : (
          suppliers.length === 0 ? (
            renderEmptyState('suppliers')
          ) : (
            <FlatList
              data={suppliers}
              renderItem={renderSupplier}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
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
          )
        )}
      </View>

      {/* Add Button */}
      {renderAddButton()}

      {/* Add Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {modalType === 'material' ? 'Material' : 'Supplier'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalType === 'material' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Material Name *"
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Category"
                  value={formData.category}
                  onChangeText={(text) => setFormData({...formData, category: text})}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Unit (kg, liter, piece, etc.)"
                  value={formData.unit}
                  onChangeText={(text) => setFormData({...formData, unit: text})}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Cost per Unit *"
                  value={formData.costPerUnit}
                  onChangeText={(text) => setFormData({...formData, costPerUnit: text})}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Current Stock"
                  value={formData.currentStock}
                  onChangeText={(text) => setFormData({...formData, currentStock: text})}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Minimum Stock Level"
                  value={formData.minStock}
                  onChangeText={(text) => setFormData({...formData, minStock: text})}
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Supplier Name *"
                  value={supplierFormData.name}
                  onChangeText={(text) => setSupplierFormData({...supplierFormData, name: text})}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Contact Number *"
                  value={supplierFormData.contact}
                  onChangeText={(text) => setSupplierFormData({...supplierFormData, contact: text})}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Email"
                  value={supplierFormData.email}
                  onChangeText={(text) => setSupplierFormData({...supplierFormData, email: text})}
                  keyboardType="email-address"
                />
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Address"
                  value={supplierFormData.address}
                  onChangeText={(text) => setSupplierFormData({...supplierFormData, address: text})}
                  multiline={true}
                  numberOfLines={3}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={modalType === 'material' ? saveMaterial : saveSupplier}
              >
                <Text style={styles.saveButtonText}>
                  Add {modalType === 'material' ? 'Material' : 'Supplier'}
                </Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8b5cf6',
  },
  tabButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  itemCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemCategory: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  itemInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
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
    width: '90%',
    maxHeight: '80%',
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
    backgroundColor: '#8b5cf6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
});

export default MaterialsScreen;