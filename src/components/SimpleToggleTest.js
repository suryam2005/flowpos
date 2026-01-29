
import React, { useState } from 'react';
import { View, Text, Switch, Alert, StyleSheet } from 'react-native';
import { useAppSettingsContext } from '../context/AppSettingsContext';

const SimpleToggleTest = () => {
  const [testToggle, setTestToggle] = useState(false);
  const { updateSetting } = useAppSettingsContext();

  const handleToggle = async (value) => {
    console.log('🧪 [TEST] Toggle called with:', value);
    
    try {
      // Update local state immediately
      setTestToggle(value);
      console.log('🧪 [TEST] Local state updated to:', value);
      
      // Try to save to backend
      const success = await updateSetting('autoPaymentDetection', value);
      console.log('🧪 [TEST] Backend save result:', success);
      
      if (success) {
        Alert.alert('Success', `Toggle set to: ${value}`);
      } else {
        // Revert on failure
        setTestToggle(!value);
        Alert.alert('Error', 'Failed to save setting');
      }
    } catch (error) {
      console.error('🧪 [TEST] Error:', error);
      setTestToggle(!value);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple Toggle Test</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Auto Payment Detection</Text>
        <Switch
          value={testToggle}
          onValueChange={handleToggle}
        />
      </View>
      <Text style={styles.status}>Current value: {testToggle ? 'ON' : 'OFF'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
  },
  status: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SimpleToggleTest;
