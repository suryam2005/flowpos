/**
 * Unified Chart Components - Rebuilt for Analytics Screens
 * Optimized for mobile-first design with proper responsive behavior
 * Fixes horizontal scrolling, chart cutoff, and performance issues
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { colors } from '../styles/colors';
import { spacing, getChartWidth, getResponsiveHeight } from '../styles/analyticsStyles';

// Get screen dimensions for responsive charts
const screenWidth = Dimensions.get('window').width;

/**
 * Enhanced Chart Card Container
 * Provides consistent styling and layout for all charts
 */
export const ChartCard = ({ title, children, style }) => (
  <View style={[styles.chartCard, style]}>
    {title && <Text style={styles.chartTitle}>{title}</Text>}
    {children}
  </View>
);

/**
 * Rebuilt Bar Chart Component
 * FIXED: Uses 'value' field as primary data source for flexibility
 */
export const BarChart = ({ 
  data, 
  height = 200, 
  color = colors.primary.main,
  showValues = true,
  valuePrefix = '',
  minBarHeight = 4,
  largeMode = false, // For Advanced Analytics larger sizing
}) => {
  if (!data || data.length === 0) {
    return <NoDataChart height={height} message="No data available for chart" />;
  }

  const safeData = data.filter(item => item && typeof item === 'object');
  if (safeData.length === 0) {
    return <NoDataChart height={height} message="No valid data for chart" />;
  }

  // FIXED: Prioritize 'value' field, then fall back to others
  const getValue = (item) => Number(item.value ?? item.revenue ?? item.orders ?? 0);
  
  const maxValue = Math.max(...safeData.map(getValue));
  const valueTopSpace = largeMode ? 35 : 30; // More space for value labels
  const chartHeight = Math.max(height - 60, 100);
  
  // Bar dimensions - larger for Advanced Analytics
  const minBarWidth = largeMode ? 50 : 45;
  const barGap = largeMode ? 8 : 6;
  const totalBarsWidth = safeData.length * (minBarWidth + barGap);
  const containerWidth = screenWidth - 72;
  const needsScroll = totalBarsWidth > containerWidth;
  const barWidth = needsScroll ? minBarWidth : Math.max((containerWidth / safeData.length) - barGap, 35);

  // Format value to prevent cutoff - use K for thousands
  const formatValue = (val) => {
    if (val >= 10000) return `${(val / 1000).toFixed(0)}K`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const chartContent = (
    <View style={[styles.chartBars, { 
      width: needsScroll ? totalBarsWidth : '100%', 
      height: chartHeight,
      paddingTop: valueTopSpace,
    }]}>
      {safeData.map((item, index) => {
        const value = getValue(item);
        const barHeight = maxValue > 0 ? Math.max((value / maxValue) * (chartHeight - valueTopSpace - 25), minBarHeight) : minBarHeight;
        
        // FIXED: Use short day labels only (Mon, Tue, etc.) - strip date numbers
        let label = item.label || item.day || item.week || item.hour || `${index + 1}`;
        // Extract just the day name if it contains a space (e.g., "Mon 23" -> "Mon")
        if (label.includes(' ')) {
          label = label.split(' ')[0];
        }
        if (label.length > 4) label = label.substring(0, 3);
        
        const displayValue = valuePrefix ? `${valuePrefix}${formatValue(value)}` : formatValue(value);
        
        return (
          <View key={index} style={[styles.barContainer, { width: barWidth, marginHorizontal: barGap / 2 }]}>
            {showValues && (
              <Text style={[styles.barValueTop, largeMode && styles.barValueTopLarge]} numberOfLines={1}>
                {displayValue}
              </Text>
            )}
            <View style={styles.barWrapper}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: color, width: barWidth - 6 }]} />
            </View>
            <Text style={[styles.barLabel, largeMode && styles.barLabelLarge]} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.chartContainer, { height }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={needsScroll}
        contentContainerStyle={styles.chartScrollContent}
      >
        {chartContent}
      </ScrollView>
    </View>
  );
};

/**
 * Horizontal Bar Chart Component for Avg Order Value
 * Better visualization for comparing values across periods
 */
export const HorizontalBarChart = ({ 
  data, 
  height = 180, 
  color = colors.info.main,
  valuePrefix = '₹',
  largeMode = false, // For Advanced Analytics larger sizing
}) => {
  if (!data || data.length === 0) {
    return <NoDataChart height={height} message="No data available for chart" />;
  }

  const safeData = data.filter(item => item && typeof item === 'object').slice(0, 6);
  if (safeData.length === 0) {
    return <NoDataChart height={height} message="No valid data for chart" />;
  }

  const getValue = (item) => Number(item.value ?? item.revenue ?? 0);
  const maxValue = Math.max(...safeData.map(getValue));
  const barHeight = largeMode ? 20 : Math.max((height - 20) / safeData.length - 8, 20);

  return (
    <View style={[styles.horizontalChartContainer, { height }]}>
      {safeData.map((item, index) => {
        const value = getValue(item);
        const barWidth = maxValue > 0 ? Math.max((value / maxValue) * 100, 5) : 5;
        // FIXED: Use short day labels only
        let label = item.label || item.day || `${index + 1}`;
        if (label.includes(' ')) {
          label = label.split(' ')[0];
        }
        if (label.length > 5) label = label.substring(0, 4);
        
        return (
          <View key={index} style={[styles.horizontalBarRow, largeMode && styles.horizontalBarRowLarge]}>
            <Text style={[styles.horizontalBarLabel, largeMode && styles.horizontalBarLabelLarge]} numberOfLines={1}>{label}</Text>
            <View style={[styles.horizontalBarTrack, largeMode && styles.horizontalBarTrackLarge]}>
              <View style={[styles.horizontalBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.horizontalBarValue, largeMode && styles.horizontalBarValueLarge]}>{valuePrefix}{value}</Text>
          </View>
        );
      })}
    </View>
  );
};

/**
 * LineChart - Keep for compatibility but simplified
 */
export const LineChart = ({ 
  data, 
  height = 180, 
  color = colors.success.main,
  showPoints = true,
  showValues = false 
}) => {
  // Redirect to HorizontalBarChart for better visualization
  return <HorizontalBarChart data={data} height={height} color={color} valuePrefix="₹" />;
};

/**
 * Pie Chart Component for Product Distribution
 * FIXED: Using horizontal bar representation which is cleaner and more readable on mobile
 * Shows proportional data with proper percentages and colors
 */
export const PieChart = ({ 
  data, 
  size = 120, 
  showLegend = true,
  centerText = "",
  colors: chartColors = [
    colors.primary.main,
    colors.success.main,
    colors.warning.main,
    colors.error.main,
    colors.info.main,
  ]
}) => {
  if (!data || data.length === 0) {
    return <NoDataChart height={size + 40} message="No products data available" />;
  }

  const safeData = data.filter(item => item && typeof item === 'object' && (item.quantity || item.value || item.revenue || 0) > 0);
  if (safeData.length === 0) {
    return <NoDataChart height={size + 40} message="No products with sales data" />;
  }

  // Calculate total for percentages
  const total = safeData.reduce((sum, item) => sum + (item.value || item.revenue || item.quantity || 0), 0);

  // Calculate segments with proper proportions
  const segments = safeData.slice(0, 5).map((item, index) => {
    const value = item.value || item.revenue || item.quantity || 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return {
      ...item,
      value,
      percentage,
      color: chartColors[index % chartColors.length],
    };
  });

  // Sort by percentage descending
  segments.sort((a, b) => b.percentage - a.percentage);

  return (
    <View style={styles.pieChartContainer}>
      {/* Stacked horizontal bar showing distribution */}
      <View style={styles.stackedBarContainer}>
        <View style={styles.stackedBar}>
          {segments.map((segment, index) => (
            <View
              key={index}
              style={{
                width: `${segment.percentage}%`,
                height: '100%',
                backgroundColor: segment.color,
              }}
            />
          ))}
        </View>
      </View>
      
      {/* Legend with percentages */}
      {showLegend && (
        <View style={styles.pieBarLegend}>
          {segments.map((segment, index) => (
            <View key={index} style={styles.pieBarLegendItem}>
              <View style={styles.pieBarLegendLeft}>
                <View 
                  style={[
                    styles.legendColor, 
                    { backgroundColor: segment.color }
                  ]} 
                />
                <Text style={styles.pieBarLegendText} numberOfLines={1}>
                  {segment.name || `Item ${index + 1}`}
                </Text>
              </View>
              <Text style={styles.pieBarLegendPercent}>
                {segment.percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Center text as title */}
      {centerText && (
        <Text style={styles.pieBarTitle}>{centerText}</Text>
      )}
    </View>
  );
};

/**
 * DonutChart - Alias for PieChart with donut style
 * Provides same functionality as PieChart
 */
export const DonutChart = PieChart;

/**
 * Enhanced No Data Chart Component
 * Better empty state visualization
 */
export const NoDataChart = ({ height = 200, message = "No data available" }) => (
  <View style={[styles.noDataContainer, { height }]}>
    <Text style={styles.noDataIcon}>📊</Text>
    <Text style={styles.noDataTitle}>No Data</Text>
    <Text style={styles.noDataSubtitle}>{message}</Text>
  </View>
);

/**
 * Progress Chart Component for Advanced Analytics
 * Fixed text truncation issues with shorter labels and proper height
 */
export const ProgressChart = ({ data, height = 180, colors: chartColors, largeMode = false }) => {
  if (!data || data.length === 0) {
    return <NoDataChart height={height} message="No progress data available" />;
  }

  // FIXED: Limit to 4 items and ensure proper spacing
  const limitedData = data.slice(0, 4);
  const itemHeight = Math.max((height - 50) / limitedData.length, 38); // More bottom padding

  return (
    <View style={[styles.chartContainer, { height, paddingBottom: 16 }]}>
      {limitedData.map((item, index) => (
        <View key={index} style={[styles.progressItem, { height: itemHeight }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, largeMode && styles.progressLabelLarge]} numberOfLines={1} ellipsizeMode="tail">
              {item.label}
            </Text>
            <Text style={[styles.progressValue, largeMode && styles.progressValueLarge]}>{item.value}</Text>
          </View>
          <View style={[styles.progressBar, largeMode && styles.progressBarLarge]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${item.percentage || 0}%`,
                  backgroundColor: chartColors?.[index] || item.color || colors.primary.main
                }
              ]} 
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Chart Card Styles
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
  
  // Chart Container Styles
  chartContainer: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  
  chartScrollView: {
    flex: 1,
  },
  
  // Bar Chart Styles
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 25, // Space for value labels on top
    paddingBottom: 5,
  },
  
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  
  barWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  
  barLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  barValue: {
    fontSize: 9,
    color: colors.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  
  barValueTop: {
    fontSize: 10,
    color: colors.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  barValueTopLarge: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  barLabelLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  chartScrollContent: {
    paddingHorizontal: spacing.sm,
  },
  
  // Line Chart Styles (kept for compatibility)
  lineChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 40,
    position: 'relative',
  },
  
  linePointContainer: {
    position: 'relative',
    flex: 1,
    alignItems: 'center',
  },
  
  linePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  
  lineLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
    position: 'absolute',
    bottom: -30,
  },
  
  lineValue: {
    fontSize: 9,
    color: colors.text.tertiary,
    textAlign: 'center',
    position: 'absolute',
    bottom: -45,
  },
  
  // Horizontal Bar Chart Styles
  horizontalChartContainer: {
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  horizontalBarLabel: {
    width: 50,
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  
  horizontalBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  
  horizontalBarFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  
  horizontalBarValue: {
    width: 55,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'right',
  },
  
  // Large mode styles for Advanced Analytics
  horizontalBarRowLarge: {
    marginBottom: 10,
  },
  
  horizontalBarLabelLarge: {
    width: 55,
    fontSize: 13,
    fontWeight: '600',
  },
  
  horizontalBarTrackLarge: {
    height: 20,
    borderRadius: 10,
  },
  
  horizontalBarValueLarge: {
    width: 65,
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Donut Chart Styles
  donutChartContainer: {
    paddingVertical: spacing.md,
  },
  
  donutChartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  donutContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  
  donutChart: {
    position: 'relative',
    borderRadius: 1000,
    backgroundColor: colors.gray[100],
    overflow: 'hidden',
  },
  
  donutSegment: {
    position: 'absolute',
  },
  
  donutCenter: {
    position: 'absolute',
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  donutCenterText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  donutLegend: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  
  // Pie Chart Styles - Horizontal Bar Style
  pieChartContainer: {
    paddingVertical: spacing.sm,
  },
  
  stackedBarContainer: {
    marginBottom: spacing.md,
  },
  
  stackedBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  
  pieBarLegend: {
    marginTop: spacing.sm,
  },
  
  pieBarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingVertical: 4,
  },
  
  pieBarLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  pieBarLegendText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  
  pieBarLegendPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    minWidth: 50,
    textAlign: 'right',
  },
  
  pieBarTitle: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  
  pieChartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  pieContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  
  pieChart: {
    position: 'relative',
    overflow: 'hidden',
  },
  
  pieSegment: {
    position: 'absolute',
  },
  
  pieCenter: {
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.surface,
  },
  
  pieCenterText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  pieLegend: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
  
  // Progress Chart Styles
  progressItem: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  progressLabel: {
    fontSize: 13, // Slightly smaller font
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
    fontWeight: '500',
  },
  
  progressBar: {
    height: 6, // Slightly smaller bar
    backgroundColor: colors.gray[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  progressValue: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    minWidth: 60, // Ensure value has enough space
    textAlign: 'right',
  },
  
  // Large mode styles for Progress Chart
  progressLabelLarge: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  progressValueLarge: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
  },
  
  progressBarLarge: {
    height: 8,
    borderRadius: 4,
  },
  
  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  
  noDataIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  noDataSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});