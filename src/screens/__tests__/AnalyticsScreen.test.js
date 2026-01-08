/**
 * Unit Tests for AnalyticsScreen Parent-Child API Call Fix
 * Feature: api-phase1-optimization
 * Task: 9. Fix parent-child duplicate API calls in analytics flow
 * 
 * These tests validate that parent-child duplicate API calls have been properly removed
 * by ensuring AnalyticsScreen passes data to AdvancedAnalyticsScreen to avoid duplicate fetching.
 */

describe('AnalyticsScreen Parent-Child API Call Fix', () => {
  /**
   * Test that verifies AnalyticsScreen passes data to AdvancedAnalyticsScreen
   * This validates Requirements 2.1, 2.2 - parent owns data fetching, child receives via props
   */
  test('should pass data to AdvancedAnalyticsScreen to avoid duplicate API calls', () => {
    const fs = require('fs');
    const path = require('path');
    
    const analyticsScreenPath = path.join(__dirname, '../AnalyticsScreen.js');
    const fileContent = fs.readFileSync(analyticsScreenPath, 'utf8');
    
    // Should navigate to AdvancedAnalytics with data parameters
    expect(fileContent).toMatch(/navigation\.navigate\s*\(\s*['"`]AdvancedAnalytics['"`]\s*,\s*\{/);
    
    // Should pass ordersData parameter
    expect(fileContent).toMatch(/ordersData\s*:\s*orders/);
    
    // Should pass productsData parameter
    expect(fileContent).toMatch(/productsData\s*:\s*products/);
    
    // Should pass analyticsData parameter
    expect(fileContent).toMatch(/analyticsData\s*:\s*analytics/);
    
    // Should pass chartData parameter
    expect(fileContent).toMatch(/chartData\s*:\s*chartData/);
  });

  /**
   * Test that verifies AdvancedAnalyticsScreen checks for passed data
   * This validates Requirements 2.1, 2.3 - child components receive data via props
   */
  test('AdvancedAnalyticsScreen should check for passed data before making API calls', () => {
    const fs = require('fs');
    const path = require('path');
    
    const advancedAnalyticsPath = path.join(__dirname, '../AdvancedAnalyticsScreen.js');
    const fileContent = fs.readFileSync(advancedAnalyticsPath, 'utf8');
    
    // Should check for route params with ordersData and productsData
    expect(fileContent).toMatch(/route\?\.\s*params\?\.\s*ordersData/);
    expect(fileContent).toMatch(/route\?\.\s*params\?\.\s*productsData/);
    
    // Should have processPassedData function
    expect(fileContent).toMatch(/processPassedData/);
    
    // Should use passed data instead of making API calls when available
    expect(fileContent).toMatch(/Using data passed from parent AnalyticsScreen/);
  });

  /**
   * Test that verifies processPassedData function exists and processes data correctly
   * This validates Requirements 2.4 - remove redundant API calls from child components
   */
  test('should have processPassedData function that processes data without API calls', () => {
    const fs = require('fs');
    const path = require('path');
    
    const advancedAnalyticsPath = path.join(__dirname, '../AdvancedAnalyticsScreen.js');
    const fileContent = fs.readFileSync(advancedAnalyticsPath, 'utf8');
    
    // Should have processPassedData function definition
    expect(fileContent).toMatch(/const\s+processPassedData\s*=\s*\(/);
    
    // Should process analytics without making API calls
    expect(fileContent).toMatch(/processPassedData[\s\S]*calculatePeriodAnalytics/);
    expect(fileContent).toMatch(/processPassedData[\s\S]*setAnalytics/);
    expect(fileContent).toMatch(/processPassedData[\s\S]*setChartData/);
    
    // Should NOT make ordersService or productsService calls in processPassedData
    const processPassedDataMatch = fileContent.match(/const\s+processPassedData\s*=[\s\S]*?};/);
    if (processPassedDataMatch) {
      const processPassedDataContent = processPassedDataMatch[0];
      expect(processPassedDataContent).not.toMatch(/ordersService\.getOrders/);
      expect(processPassedDataContent).not.toMatch(/productsService\.getProducts/);
    }
  });

  /**
   * Test that verifies user-triggered refresh still makes API calls
   * This validates Requirements 7.1, 7.4 - preserve user-triggered actions
   */
  test('should preserve user-triggered refresh functionality in AdvancedAnalyticsScreen', () => {
    const fs = require('fs');
    const path = require('path');
    
    const advancedAnalyticsPath = path.join(__dirname, '../AdvancedAnalyticsScreen.js');
    const fileContent = fs.readFileSync(advancedAnalyticsPath, 'utf8');
    
    // Should have onRefresh function that calls loadAdvancedAnalytics
    expect(fileContent).toMatch(/onRefresh\s*=[\s\S]*loadAdvancedAnalytics\s*\(\s*true\s*\)/);
    
    // Should have comment about fresh API calls on refresh
    expect(fileContent).toMatch(/Always make fresh API calls on user-triggered refresh/);
  });

  /**
   * Test that verifies chart components don't make API calls
   * This validates Requirements 2.1, 2.2 - only parent component owns API calls
   */
  test('chart components should not make API calls', () => {
    const fs = require('fs');
    const path = require('path');
    
    const chartComponentsPath = path.join(__dirname, '../../components/ChartComponents.js');
    const fileContent = fs.readFileSync(chartComponentsPath, 'utf8');
    
    // Should NOT import any services
    expect(fileContent).not.toMatch(/import.*Service.*from/);
    expect(fileContent).not.toMatch(/from.*service/i);
    
    // Should NOT make API calls
    expect(fileContent).not.toMatch(/\.getOrders\s*\(/);
    expect(fileContent).not.toMatch(/\.getProducts\s*\(/);
    expect(fileContent).not.toMatch(/apiCall/);
    expect(fileContent).not.toMatch(/fetch\s*\(/);
  });

  /**
   * Test that verifies the Phase 1 optimization is properly documented
   * This validates that the changes are properly documented
   */
  test('should have Phase 1 optimization documentation', () => {
    const fs = require('fs');
    const path = require('path');
    
    const advancedAnalyticsPath = path.join(__dirname, '../AdvancedAnalyticsScreen.js');
    const fileContent = fs.readFileSync(advancedAnalyticsPath, 'utf8');
    
    // Should have documentation about avoiding duplicate API calls
    expect(fileContent).toMatch(/avoid duplicate API calls/i);
    expect(fileContent).toMatch(/passed from parent/i);
  });
});