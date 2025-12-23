import { StyleSheet } from 'react-native';
import { colors } from './colors';

/**
 * Standardized Button Styles for FlowPOS
 * 
 * This file provides consistent button styling across the entire application.
 * All buttons should use these standardized styles to ensure UI consistency.
 * 
 * Button Types:
 * - Primary: Main actions (Login, Complete Order, Save)
 * - Secondary: Alternative actions (Cancel, Back)
 * - Success: Positive actions (Confirm, Complete)
 * - Danger: Destructive actions (Delete, Clear, Remove)
 * - Icon: Icon-only actions (Settings, Close, Back)
 * 
 * Usage:
 * import { buttonStyles } from '../styles/buttonStyles';
 * <TouchableOpacity style={buttonStyles.primary}>
 *   <Text style={buttonStyles.primaryText}>Action</Text>
 * </TouchableOpacity>
 */

export const buttonStyles = StyleSheet.create({
  // ===== PRIMARY BUTTONS =====
  // Main actions: Login, Complete Order, Save, Submit
  primary: {
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryText: {
    color: colors.background.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ===== SECONDARY BUTTONS =====
  // Alternative actions: Cancel, Back, Skip
  secondary: {
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  secondaryText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ===== SUCCESS BUTTONS =====
  // Positive actions: Complete, Confirm, Success
  success: {
    backgroundColor: colors.success.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.success.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    color: colors.background.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ===== DANGER BUTTONS =====
  // Destructive actions: Delete, Clear, Remove
  danger: {
    backgroundColor: colors.error.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.error.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerText: {
    color: colors.background.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ===== ICON BUTTONS =====
  // Icon-only actions: Settings, Close, Back, Menu
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== COMPACT BUTTONS =====
  // Smaller buttons for tight spaces
  compact: {
    backgroundColor: colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  compactText: {
    color: colors.background.surface,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  compactSecondary: {
    backgroundColor: colors.background.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  compactSecondaryText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ===== BUTTON STATES =====
  // Apply these in combination with base button styles
  disabled: {
    opacity: 0.6,
  },
  loading: {
    opacity: 0.8,
  },

  // ===== SPECIAL BUTTONS =====
  // Card-style buttons for product cards, etc.
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Floating action button style
  floating: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Toggle button styles
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  toggleActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
  },

  // Payment method button styles
  paymentMethod: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.surface,
    flex: 1,
    marginHorizontal: 4,
  },
  paymentMethodActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 8,
  },
  paymentMethodTextActive: {
    color: colors.primary.main,
  },

  // Quantity control buttons
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Category/Tag buttons
  category: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    minWidth: 80,
    alignItems: 'center',
  },
  categoryActive: {
    backgroundColor: colors.primary.main,
  },
  categoryText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: colors.background.surface,
  },
});

/**
 * Helper function to get button style with state
 * @param {string} type - Button type (primary, secondary, success, danger, etc.)
 * @param {boolean} disabled - Whether button is disabled
 * @param {boolean} loading - Whether button is loading
 * @returns {Array} Array of styles to apply
 */
export const getButtonStyle = (type, disabled = false, loading = false) => {
  const baseStyle = buttonStyles[type] || buttonStyles.primary;
  const styles = [baseStyle];
  
  if (disabled) styles.push(buttonStyles.disabled);
  if (loading) styles.push(buttonStyles.loading);
  
  return styles;
};

/**
 * Helper function to get button text style
 * @param {string} type - Button type (primary, secondary, success, danger, etc.)
 * @returns {Object} Text style object
 */
export const getButtonTextStyle = (type) => {
  return buttonStyles[`${type}Text`] || buttonStyles.primaryText;
};

export default buttonStyles;