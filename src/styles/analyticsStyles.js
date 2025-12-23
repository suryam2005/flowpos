/**
 * Analytics Styles - Standardized spacing and layout system
 * Provides consistent styling across both Analytics and Advanced Analytics screens
 */

import { Dimensions } from 'react-native';
import { colors } from './colors';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Standardized spacing system
export const spacing = {
  xs: 4,    // Small gaps
  sm: 8,    // Component spacing
  md: 16,   // Section spacing
  lg: 24,   // Major section spacing
  xl: 32,   // Screen padding
};

// Chart dimensions for different screen sizes
export const chartSizes = {
  small: { height: 180, minWidth: 300 },
  medium: { height: 220, minWidth: 350 },
  large: { height: 280, minWidth: 400 },
};

// Responsive breakpoints
export const breakpoints = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
};

// Common analytics styles
export const analyticsStyles = {
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  content: {
    flex: 1,
  },
  
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 140, // Account for bottom navigation
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.lg,
  },
  
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  
  tabActive: {
    borderBottomColor: colors.primary.main,
  },
  
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  
  tabTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  
  // Stat card styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  
  statCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: spacing.md,
    width: screenWidth < breakpoints.tablet ? '48%' : '23%',
    marginBottom: spacing.md,
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
    marginBottom: spacing.sm,
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
  
  // Section styles
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Chart card styles
  chartCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Product list styles
  productItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    marginRight: spacing.md,
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
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  
  productInfo: {
    flex: 1,
    marginRight: spacing.md,
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
  
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    color: colors.text.tertiary,
  },
  
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  
  // Button styles
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  
  buttonSecondary: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  
  buttonTextSecondary: {
    color: colors.text.primary,
  },
};

// Responsive helper functions
export const getResponsiveWidth = (baseWidth) => {
  if (screenWidth < breakpoints.mobile) {
    return baseWidth * 0.9;
  } else if (screenWidth < breakpoints.tablet) {
    return baseWidth;
  } else {
    return baseWidth * 1.2;
  }
};

export const getResponsiveHeight = (baseHeight) => {
  if (screenWidth < breakpoints.mobile) {
    return baseHeight * 0.8;
  } else if (screenWidth < breakpoints.tablet) {
    return baseHeight;
  } else {
    return baseHeight * 1.1;
  }
};

export const getChartWidth = (dataLength) => {
  const minBarWidth = 40;
  const maxBarsVisible = 7;
  const idealBarWidth = Math.max((screenWidth - 120) / Math.min(dataLength, maxBarsVisible), minBarWidth);
  const barWidth = dataLength > maxBarsVisible ? minBarWidth : idealBarWidth;
  const spacing = Math.max(barWidth * 0.2, 4);
  return dataLength * (barWidth + spacing) + 40;
};