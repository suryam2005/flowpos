import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { safeGoBack } from '../../utils/navigationUtils';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile, fetchUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true); // Start with loading
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Always start in view mode
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Try to get fresh data from API first
      let userData = user;
      if (!userData) {
        userData = await fetchUserProfile();
      }
      
      // Fallback to AsyncStorage if API fails
      if (!userData) {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          userData = JSON.parse(storedUserData);
        }
      }

      if (userData) {
        const userFormData = {
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
        };
        setFormData(userFormData);
        setOriginalData(userFormData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.phone && formData.phone.length > 0) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
      };

      // Call backend API to update profile
      const updatedUser = await updateProfile(updateData);
      
      if (updatedUser) {
        // Update form data with response
        setFormData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
        });
        setOriginalData(updatedUser);
        setIsEditing(false);
        
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setErrors({});
    setIsEditing(false);
  };

  const renderField = (label, value, field, options = {}) => {
    const { 
      placeholder = `Enter your ${label.toLowerCase()}`,
      keyboardType = 'default',
      autoCapitalize = 'none',
      multiline = false,
      maxLength = null,
      required = false
    } = options;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {label} {required && '*'}
        </Text>
        
        {isEditing ? (
          <>
            <TextInput
              style={[
                styles.input, 
                multiline && styles.textArea,
                errors[field] && styles.inputError
              ]}
              placeholder={placeholder}
              value={value}
              onChangeText={(text) => updateField(field, text)}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              multiline={multiline}
              numberOfLines={multiline ? 4 : 1}
              textAlignVertical={multiline ? 'top' : 'center'}
              maxLength={maxLength}
            />
            {maxLength && multiline && (
              <Text style={styles.characterCount}>
                {value.length}/{maxLength} characters
              </Text>
            )}
          </>
        ) : (
          <View style={[styles.displayField, multiline && styles.displayFieldMultiline]}>
            <Text style={[styles.displayText, !value && styles.placeholderText]}>
              {value || 'Not provided'}
            </Text>
          </View>
        )}
        
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner visible={true} text="Loading profile..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeGoBack(navigation)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Profile' : 'Profile'}
          </Text>
          {isEditing ? (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoadingSpinner size="small" color={colors.background.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>


          {/* Form Fields */}
          <View style={styles.formContainer}>
            {renderField('Full Name', formData.name, 'name', {
              placeholder: 'Enter your full name',
              autoCapitalize: 'words',
              required: true
            })}

            {renderField('Email Address', formData.email, 'email', {
              placeholder: 'Enter your email',
              keyboardType: 'email-address',
              required: true
            })}

            {renderField('Phone Number', formData.phone, 'phone', {
              placeholder: 'Enter your phone number',
              keyboardType: 'phone-pad',
              maxLength: 15
            })}
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  scrollView: {
    flex: 1,
  },


  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: colors.error.main,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  accountActions: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 12,
  },
  dangerText: {
    color: colors.error.main,
  },
  displayField: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    justifyContent: 'center',
  },
  displayFieldMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  displayText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  linkText: {
    color: colors.primary.main,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});

export default EditProfileScreen;