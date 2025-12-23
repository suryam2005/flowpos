/**
 * Standardized Spacing System for FlowPOS
 * Replaces inconsistent spacing values with a unified scale
 */

export const spacing = {
  xs: 4,    // Extra small - fine adjustments, icon gaps
  sm: 8,    // Small - tight spacing, small gaps
  md: 12,   // Medium - standard spacing, button padding
  lg: 16,   // Large - card padding, section spacing
  xl: 20,   // Extra large - header padding, major sections
  xxl: 24,  // Double XL - content padding, major gaps
  xxxl: 32, // Triple XL - major section breaks
  huge: 40, // Huge - major layout spacing
  massive: 60, // Massive - top padding for headers
};

// Spacing usage guidelines for consistent application
export const spacingUsage = {
  // Icon spacing
  iconGap: spacing.sm,        // 8px - consistent icon margins
  
  // Button spacing
  buttonPadding: spacing.md,  // 12px - internal button padding
  buttonGap: spacing.md,      // 12px - gap between buttons
  
  // Card spacing
  cardPadding: spacing.lg,    // 16px - internal card padding
  cardMargin: spacing.md,     // 12px - margin between cards
  
  // Section spacing
  sectionGap: spacing.xl,     // 20px - gap between sections
  sectionPadding: spacing.xxl, // 24px - section internal padding
  
  // Header spacing
  headerPadding: spacing.xl,  // 20px - header horizontal padding
  headerTop: spacing.massive, // 60px - header top padding
  
  // Content spacing
  contentPadding: spacing.xl, // 20px - main content padding
  
  // Form spacing
  inputMargin: spacing.lg,    // 16px - margin between inputs
  labelMargin: spacing.sm,    // 8px - margin below labels
  
  // List spacing
  listItemPadding: spacing.lg, // 16px - list item internal padding
  listItemMargin: spacing.md,  // 12px - margin between list items
};

// Helper function to get spacing value
export const getSpacing = (size) => {
  return spacing[size] || size;
};

// Migration map for converting old values to new standard
export const spacingMigration = {
  4: spacing.xs,    // 4 → 4 ✅
  6: spacing.sm,    // 6 → 8 (standardized)
  8: spacing.sm,    // 8 → 8 ✅
  10: spacing.md,   // 10 → 12 (standardized)
  12: spacing.md,   // 12 → 12 ✅
  14: spacing.lg,   // 14 → 16 (standardized)
  16: spacing.lg,   // 16 → 16 ✅
  18: spacing.xl,   // 18 → 20 (standardized)
  20: spacing.xl,   // 20 → 20 ✅
  24: spacing.xxl,  // 24 → 24 ✅
  32: spacing.xxxl, // 32 → 32 ✅
  40: spacing.huge, // 40 → 40 ✅
  60: spacing.massive, // 60 → 60 ✅
};

export default spacing;