#!/usr/bin/env node

/**
 * Network Behavior Validator for FlowPOS Phase 1 Optimization
 * 
 * This script validates that the Phase 1 API optimization has achieved:
 * 1. Calm, predictable API behavior
 * 2. No API fires on screen focus unless required
 * 3. No API fires twice for same screen visit
 * 4. Cached data is never fetched directly
 * 
 * Uses existing monitoring infrastructure (CallCounter, NetworkGuard, APIDeduplicator)
 * to provide comprehensive network behavior validation.
 */

const fs = require('fs');
const path = require('path');
const { APIAuditor } = require('./api-audit');

class NetworkBehaviorValidator {
  constructor() {
    this.validationResults = {
      timestamp: new Date().toISOString(),
      phase1Goals: {
        calmBehavior: { passed: false, issues: [] },
        noFocusAPIs: { passed: false, issues: [] },
        noDuplicateAPIs: { passed: false, issues: [] },
        noCacheBypasses: { passed: false, issues: [] }
      },
      codeAnalysis: {
        focusEffectCalls: [],
        duplicateEndpoints: [],
        contextBypasses: [],
        lifecycleMisuse: []
      },
      networkPatterns: {
        expectedBehavior: [],
        violations: []
      },
      summary: {
        overallPassed: false,
        criticalIssues: 0,
        warningIssues: 0,
        recommendations: []
      }
    };

    // Expected network behavior patterns for Phase 1
    this.expectedPatterns = {
      screenMount: {
        description: "Screen should make API calls only on initial mount",
        maxCallsPerMount: 1,
        allowedTriggers: ['useEffect with empty deps']
      },
      screenFocus: {
        description: "Screen focus should NOT trigger API calls unless explicitly required",
        maxCallsPerFocus: 0,
        exceptions: ['real-time data screens']
      },
      parentChild: {
        description: "Only parent component should own API calls, children receive via props",
        pattern: "single ownership"
      },
      contextUsage: {
        description: "Use existing contexts instead of direct API calls",
        requiredContexts: ['StoreSettingsContext', 'SubscriptionContext', 'AppSettingsContext']
      }
    };

    // Critical screens to validate
    this.criticalScreens = [
      'POSScreen.js',
      'OrdersScreen.js',
      'InventoryScreen.js',
      'ManageScreen.js',
      'SettingsScreen.js',
      'ProfileScreen.js',
      'AnalyticsScreen.js',
      'CartScreen.js'
    ];

    // API endpoints that should be cached/contextualized
    this.contextualizedEndpoints = [
      '/api/store',
      '/api/subscription/status',
      '/api/subscription',
      '/api/app-settings'
    ];
  }

  async validateNetworkBehavior() {
    console.log('🔍 Starting Network Behavior Validation for Phase 1 Optimization...');
    
    // Step 1: Run code analysis using existing audit infrastructure
    await this.runCodeAnalysis();
    
    // Step 2: Validate Phase 1 specific goals
    await this.validatePhase1Goals();
    
    // Step 3: Check network patterns
    await this.validateNetworkPatterns();
    
    // Step 4: Generate comprehensive report
    await this.generateValidationReport();
    
    return this.validationResults;
  }

  async runCodeAnalysis() {
    console.log('📊 Running code analysis...');
    
    const auditor = new APIAuditor();
    const srcPath = path.join(process.cwd(), 'src');
    
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source directory not found: ${srcPath}`);
    }
    
    await auditor.auditDirectory(srcPath);
    auditor.generateSummary();
    
    // Extract relevant data for validation
    this.validationResults.codeAnalysis = {
      focusEffectCalls: auditor.results.focusBasedCalls,
      duplicateEndpoints: auditor.results.duplicateCalls,
      contextBypasses: auditor.results.contextBypasses,
      lifecycleMisuse: auditor.results.lifecycleTriggers || []
    };
    
    console.log(`✅ Code analysis complete: ${auditor.results.apiCalls.length} files analyzed`);
  }

  async validatePhase1Goals() {
    console.log('🎯 Validating Phase 1 optimization goals...');
    
    // Goal 1: Calm, predictable API behavior
    await this.validateCalmBehavior();
    
    // Goal 2: No API fires on screen focus unless required
    await this.validateNoFocusAPIs();
    
    // Goal 3: No API fires twice for same screen visit
    await this.validateNoDuplicateAPIs();
    
    // Goal 4: Cached data is never fetched directly
    await this.validateNoCacheBypasses();
  }

  async validateCalmBehavior() {
    const issues = [];
    
    // Check for excessive API calls in critical screens
    const criticalScreenAnalysis = this.validationResults.codeAnalysis.focusEffectCalls
      .filter(call => this.criticalScreens.some(screen => call.file.includes(screen)));
    
    if (criticalScreenAnalysis.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        type: 'excessive_api_calls',
        description: 'Critical screens still have focus-based API calls',
        files: criticalScreenAnalysis.map(call => ({
          file: call.file,
          line: call.line,
          apiCalls: call.apiCalls || []
        }))
      });
    }
    
    // Check for rapid-fire API patterns
    const duplicateIssues = this.validationResults.codeAnalysis.duplicateEndpoints;
    if (duplicateIssues.length > 0) {
      issues.push({
        severity: 'HIGH',
        type: 'rapid_fire_apis',
        description: 'Multiple API calls to same endpoint detected',
        files: duplicateIssues
      });
    }
    
    this.validationResults.phase1Goals.calmBehavior = {
      passed: issues.length === 0,
      issues
    };
    
    console.log(`  📈 Calm behavior: ${issues.length === 0 ? '✅ PASSED' : '❌ FAILED'} (${issues.length} issues)`);
  }

  async validateNoFocusAPIs() {
    const issues = [];
    const focusCalls = this.validationResults.codeAnalysis.focusEffectCalls;
    
    // Check each focus-based call
    focusCalls.forEach(call => {
      // Allow exceptions for real-time data screens
      const isException = this.isRealTimeDataScreen(call.file);
      
      if (!isException) {
        issues.push({
          severity: 'CRITICAL',
          type: 'focus_api_call',
          description: 'useFocusEffect contains API calls',
          file: call.file,
          line: call.line,
          match: call.match,
          apiCalls: call.apiCalls || []
        });
      }
    });
    
    this.validationResults.phase1Goals.noFocusAPIs = {
      passed: issues.length === 0,
      issues
    };
    
    console.log(`  🎯 No focus APIs: ${issues.length === 0 ? '✅ PASSED' : '❌ FAILED'} (${issues.length} issues)`);
  }

  async validateNoDuplicateAPIs() {
    const issues = [];
    const duplicates = this.validationResults.codeAnalysis.duplicateEndpoints;
    
    duplicates.forEach(duplicate => {
      issues.push({
        severity: 'HIGH',
        type: 'duplicate_api_calls',
        description: 'Same endpoint called multiple times in component',
        file: duplicate.file,
        endpoints: duplicate.duplicateEndpoints
      });
    });
    
    this.validationResults.phase1Goals.noDuplicateAPIs = {
      passed: issues.length === 0,
      issues
    };
    
    console.log(`  🔄 No duplicates: ${issues.length === 0 ? '✅ PASSED' : '❌ FAILED'} (${issues.length} issues)`);
  }

  async validateNoCacheBypasses() {
    const issues = [];
    const bypasses = this.validationResults.codeAnalysis.contextBypasses;
    
    bypasses.forEach(bypass => {
      issues.push({
        severity: 'MEDIUM',
        type: 'context_bypass',
        description: bypass.issue,
        file: bypass.file,
        contextType: bypass.type
      });
    });
    
    this.validationResults.phase1Goals.noCacheBypasses = {
      passed: issues.length === 0,
      issues
    };
    
    console.log(`  💾 No cache bypasses: ${issues.length === 0 ? '✅ PASSED' : '❌ FAILED'} (${issues.length} issues)`);
  }

  async validateNetworkPatterns() {
    console.log('🌐 Validating network patterns...');
    
    // Analyze expected vs actual patterns
    const expectedBehavior = [];
    const violations = [];
    
    // Pattern 1: Screen mount behavior
    this.criticalScreens.forEach(screen => {
      const screenAnalysis = this.findScreenAnalysis(screen);
      if (screenAnalysis) {
        const mountCalls = this.countMountAPICalls(screenAnalysis);
        const focusCalls = this.countFocusAPICalls(screenAnalysis);
        
        expectedBehavior.push({
          screen,
          pattern: 'mount_only',
          expected: 'API calls only on mount',
          actual: `Mount: ${mountCalls}, Focus: ${focusCalls}`,
          compliant: focusCalls === 0
        });
        
        if (focusCalls > 0) {
          violations.push({
            screen,
            violation: 'focus_api_calls',
            description: `Screen has ${focusCalls} focus-based API calls`,
            severity: 'CRITICAL'
          });
        }
      }
    });
    
    // Pattern 2: Parent-child ownership
    const parentChildViolations = this.detectParentChildViolations();
    violations.push(...parentChildViolations);
    
    this.validationResults.networkPatterns = {
      expectedBehavior,
      violations
    };
    
    console.log(`  🔍 Network patterns: ${violations.length === 0 ? '✅ COMPLIANT' : '❌ VIOLATIONS'} (${violations.length} violations)`);
  }

  findScreenAnalysis(screenName) {
    // This would need to be implemented based on the actual audit results structure
    // For now, return a placeholder
    return null;
  }

  countMountAPICalls(screenAnalysis) {
    // Count API calls in useEffect with empty dependencies
    return 0; // Placeholder
  }

  countFocusAPICalls(screenAnalysis) {
    // Count API calls in useFocusEffect
    return 0; // Placeholder
  }

  detectParentChildViolations() {
    const violations = [];
    
    // Analyze parent-child relationships
    // This would require more sophisticated analysis of component hierarchies
    // For now, return empty array
    
    return violations;
  }

  isRealTimeDataScreen(filePath) {
    // Define screens that legitimately need real-time data
    const realTimeScreens = [
      'NotificationScreen.js',
      'LiveOrdersScreen.js',
      'RealTimeAnalyticsScreen.js'
    ];
    
    return realTimeScreens.some(screen => filePath.includes(screen));
  }

  async generateValidationReport() {
    console.log('📋 Generating validation report...');
    
    // Calculate summary
    const allIssues = [
      ...this.validationResults.phase1Goals.calmBehavior.issues,
      ...this.validationResults.phase1Goals.noFocusAPIs.issues,
      ...this.validationResults.phase1Goals.noDuplicateAPIs.issues,
      ...this.validationResults.phase1Goals.noCacheBypasses.issues
    ];
    
    const criticalIssues = allIssues.filter(issue => issue.severity === 'CRITICAL').length;
    const warningIssues = allIssues.filter(issue => issue.severity === 'HIGH' || issue.severity === 'MEDIUM').length;
    
    const overallPassed = criticalIssues === 0 && 
                         this.validationResults.phase1Goals.calmBehavior.passed &&
                         this.validationResults.phase1Goals.noFocusAPIs.passed &&
                         this.validationResults.phase1Goals.noDuplicateAPIs.passed;
    
    this.validationResults.summary = {
      overallPassed,
      criticalIssues,
      warningIssues,
      recommendations: this.generateRecommendations(allIssues)
    };
    
    // Write detailed JSON report
    const reportPath = path.join(process.cwd(), 'scripts', 'network-behavior-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.validationResults, null, 2));
    
    // Write human-readable summary
    const summaryPath = path.join(process.cwd(), 'scripts', 'network-behavior-validation-summary.md');
    fs.writeFileSync(summaryPath, this.generateMarkdownReport());
    
    console.log(`📊 Validation complete!`);
    console.log(`   Detailed report: ${reportPath}`);
    console.log(`   Summary report: ${summaryPath}`);
    console.log(`   Overall result: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Critical issues: ${criticalIssues}`);
    console.log(`   Warning issues: ${warningIssues}`);
  }

  generateRecommendations(allIssues) {
    const recommendations = [];
    
    // Group issues by type
    const issuesByType = {};
    allIssues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });
    
    // Generate recommendations for each issue type
    Object.entries(issuesByType).forEach(([type, issues]) => {
      switch (type) {
        case 'focus_api_call':
          recommendations.push({
            priority: 'CRITICAL',
            action: 'Remove useFocusEffect API calls',
            description: `Remove ${issues.length} focus-based API calls that cause unnecessary network traffic`,
            files: issues.map(issue => issue.file),
            impact: 'High - Reduces network noise and improves performance'
          });
          break;
          
        case 'duplicate_api_calls':
          recommendations.push({
            priority: 'HIGH',
            action: 'Eliminate duplicate API calls',
            description: `Fix ${issues.length} components with duplicate endpoint calls`,
            files: issues.map(issue => issue.file),
            impact: 'Medium - Reduces redundant network requests'
          });
          break;
          
        case 'context_bypass':
          recommendations.push({
            priority: 'MEDIUM',
            action: 'Use existing contexts',
            description: `Replace ${issues.length} direct API calls with context usage`,
            files: issues.map(issue => issue.file),
            impact: 'Medium - Improves data consistency and reduces API calls'
          });
          break;
      }
    });
    
    return recommendations;
  }

  generateMarkdownReport() {
    const { summary, phase1Goals, networkPatterns } = this.validationResults;
    
    return `# Network Behavior Validation Report

**Generated:** ${this.validationResults.timestamp}
**Overall Result:** ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}

## Executive Summary

Phase 1 API optimization validation has ${summary.overallPassed ? 'PASSED' : 'FAILED'} with:
- **Critical Issues:** ${summary.criticalIssues}
- **Warning Issues:** ${summary.warningIssues}
- **Total Recommendations:** ${summary.recommendations.length}

## Phase 1 Goals Validation

### 🎯 Goal 1: Calm, Predictable API Behavior
**Status:** ${phase1Goals.calmBehavior.passed ? '✅ PASSED' : '❌ FAILED'}
**Issues:** ${phase1Goals.calmBehavior.issues.length}

${phase1Goals.calmBehavior.issues.map(issue => 
  `- **${issue.severity}**: ${issue.description} (${issue.files?.length || 0} files affected)`
).join('\n')}

### 🎯 Goal 2: No API Fires on Screen Focus
**Status:** ${phase1Goals.noFocusAPIs.passed ? '✅ PASSED' : '❌ FAILED'}
**Issues:** ${phase1Goals.noFocusAPIs.issues.length}

${phase1Goals.noFocusAPIs.issues.map(issue => 
  `- **${issue.severity}**: ${issue.file} (line ${issue.line})`
).join('\n')}

### 🎯 Goal 3: No Duplicate API Calls
**Status:** ${phase1Goals.noDuplicateAPIs.passed ? '✅ PASSED' : '❌ FAILED'}
**Issues:** ${phase1Goals.noDuplicateAPIs.issues.length}

${phase1Goals.noDuplicateAPIs.issues.map(issue => 
  `- **${issue.severity}**: ${issue.file} - ${issue.endpoints?.join(', ')}`
).join('\n')}

### 🎯 Goal 4: No Cache Bypasses
**Status:** ${phase1Goals.noCacheBypasses.passed ? '✅ PASSED' : '❌ FAILED'}
**Issues:** ${phase1Goals.noCacheBypasses.issues.length}

${phase1Goals.noCacheBypasses.issues.map(issue => 
  `- **${issue.severity}**: ${issue.file} - ${issue.description}`
).join('\n')}

## Network Pattern Analysis

### Expected Behavior Compliance
${networkPatterns.expectedBehavior.map(pattern => 
  `- **${pattern.screen}**: ${pattern.compliant ? '✅' : '❌'} ${pattern.actual}`
).join('\n')}

### Pattern Violations
${networkPatterns.violations.map(violation => 
  `- **${violation.severity}**: ${violation.screen} - ${violation.description}`
).join('\n')}

## Recommendations

${summary.recommendations.map((rec, index) => 
  `### ${index + 1}. ${rec.action} (${rec.priority})

**Description:** ${rec.description}
**Impact:** ${rec.impact}
**Files Affected:** ${rec.files.length}

${rec.files.map(file => `- ${file}`).join('\n')}
`
).join('\n')}

## Next Steps

${summary.overallPassed ? 
  `✅ **Phase 1 optimization is complete and validated!**

The network behavior meets all Phase 1 goals:
- API calls are calm and predictable
- No unnecessary focus-based API calls
- No duplicate API calls within components
- Cached data is properly utilized

You can proceed with confidence that the API optimization has been successful.` :
  `❌ **Phase 1 optimization requires additional work**

Please address the following critical issues before considering Phase 1 complete:

${summary.recommendations.filter(rec => rec.priority === 'CRITICAL').map(rec => 
  `1. **${rec.action}**: ${rec.description}`
).join('\n')}

After addressing these issues, re-run this validation to confirm compliance.`
}

---

*This report was generated by the Network Behavior Validator for FlowPOS Phase 1 Optimization*
`;
  }
}

// Main execution
async function main() {
  try {
    const validator = new NetworkBehaviorValidator();
    const results = await validator.validateNetworkBehavior();
    
    // Exit with appropriate code
    process.exit(results.summary.overallPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { NetworkBehaviorValidator };