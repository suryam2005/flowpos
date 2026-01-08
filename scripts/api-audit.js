#!/usr/bin/env node

/**
 * API Call Audit Script for FlowPOS Phase 1 Optimization
 * 
 * This script analyzes the codebase to identify:
 * 1. All API calls in screens and components
 * 2. Current lifecycle triggers (mount, focus, navigation)
 * 3. Duplicate calls and focus-based refetching
 * 4. Parent-child API call relationships
 * 5. Direct API calls that bypass existing contexts
 */

const fs = require('fs');
const path = require('path');

class APIAuditor {
  constructor() {
    this.results = {
      apiCalls: [],
      lifecycleTriggers: [],
      duplicateCalls: [],
      parentChildRelations: [],
      contextBypasses: [],
      focusBasedCalls: [],
      summary: {}
    };
    
    this.apiPatterns = [
      // NetworkService patterns
      /NetworkService\.apiCall\(['"`]([^'"`]+)['"`]/g,
      /NetworkService\.get\(['"`]([^'"`]+)['"`]/g,
      /NetworkService\.post\(['"`]([^'"`]+)['"`]/g,
      /NetworkService\.put\(['"`]([^'"`]+)['"`]/g,
      /NetworkService\.delete\(['"`]([^'"`]+)['"`]/g,
      
      // Direct fetch patterns
      /fetch\(['"`]([^'"`]+)['"`]/g,
      /axios\.get\(['"`]([^'"`]+)['"`]/g,
      /axios\.post\(['"`]([^'"`]+)['"`]/g,
      /axios\.put\(['"`]([^'"`]+)['"`]/g,
      /axios\.delete\(['"`]([^'"`]+)['"`]/g,
      
      // Service method patterns (more specific)
      /productsService\.(\w+)\(/g,
      /ordersService\.(\w+)\(/g,
      /featureService\.(\w+)\(/g,
      /WhatsAppService\.(\w+)\(/g,
      /CloudStorageService\.(\w+)\(/g,
      /csvExportService\.(\w+)\(/g,
      /pdfReportsService\.(\w+)\(/g,
      /GSTService\.(\w+)\(/g,
      /networkService\.(\w+)\(/g,
      /actionDetectorService\.(\w+)\(/g,
      
      // Generic service patterns
      /(\w+Service)\.(\w+)\(/g,
      
      // Direct API endpoint patterns
      /['"`](\/api\/[^'"`]+)['"`]/g,
      
      // Common API call patterns
      /refreshProducts\(\)/g,
      /loadProducts\(\)/g,
      /getProducts\(\)/g,
      /refreshOrders\(\)/g,
      /loadOrders\(\)/g,
      /getOrders\(\)/g,
      /checkWhatsAppStatus\(\)/g,
      /getStatus\(\)/g,
      /initialize\(\)/g
    ];
    
    this.lifecyclePatterns = [
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g,
      /useFocusEffect\s*\(\s*useCallback\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g,
      /useFocusEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g,
      /useCallback\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g
    ];
    
    this.contextPatterns = [
      /use(StoreSettings|AppSettings|Subscription|Auth|Cart|DataSync)\(\)/g,
      /(StoreSettingsContext|AppSettingsContext|SubscriptionContext|AuthContext|CartContext|DataSyncContext)/g
    ];
  }

  async auditDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.auditDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        await this.auditFile(fullPath);
      }
    }
  }

  async auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip test files and node_modules
      if (relativePath.includes('__tests__') || relativePath.includes('node_modules')) {
        return;
      }
      
      const fileAnalysis = {
        file: relativePath,
        apiCalls: [],
        lifecycleTriggers: [],
        contextUsage: [],
        isScreen: relativePath.includes('/screens/'),
        isComponent: relativePath.includes('/components/'),
        isService: relativePath.includes('/services/'),
        isContext: relativePath.includes('/context/'),
        isHook: relativePath.includes('/hooks/')
      };
      
      // Analyze API calls
      this.analyzeAPICalls(content, fileAnalysis);
      
      // Analyze lifecycle triggers
      this.analyzeLifecycleTriggers(content, fileAnalysis);
      
      // Analyze context usage
      this.analyzeContextUsage(content, fileAnalysis);
      
      // Store results
      this.results.apiCalls.push(fileAnalysis);
      
      // Identify specific patterns
      this.identifyProblematicPatterns(content, fileAnalysis);
      
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error.message);
    }
  }

  analyzeAPICalls(content, fileAnalysis) {
    this.apiPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const apiCall = {
          pattern: pattern.source,
          match: match[0],
          endpoint: match[1] || match[0],
          line: this.getLineNumber(content, match.index),
          context: this.getContext(content, match.index)
        };
        fileAnalysis.apiCalls.push(apiCall);
      }
    });
  }

  analyzeLifecycleTriggers(content, fileAnalysis) {
    // More comprehensive lifecycle pattern detection
    
    // Find useFocusEffect blocks with their full content
    const focusEffectPattern = /useFocusEffect\s*\(\s*useCallback\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let focusMatch;
    while ((focusMatch = focusEffectPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, focusMatch.index);
      const blockContent = focusMatch[1];
      const hasAPICall = this.containsAPICall(blockContent);
      
      fileAnalysis.lifecycleTriggers.push({
        type: 'useFocusEffect',
        match: focusMatch[0],
        line,
        hasAPICall,
        blockContent
      });
      
      if (hasAPICall) {
        this.results.focusBasedCalls.push({
          file: fileAnalysis.file,
          line,
          match: focusMatch[0],
          apiCalls: this.extractAPICallsFromBlock(blockContent)
        });
      }
    }

    // Find useEffect blocks with their dependencies
    const useEffectPattern = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\[([^\]]*)\]/g;
    let effectMatch;
    while ((effectMatch = useEffectPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, effectMatch.index);
      const blockContent = effectMatch[1];
      const dependencies = effectMatch[2];
      const hasAPICall = this.containsAPICall(blockContent);
      
      fileAnalysis.lifecycleTriggers.push({
        type: 'useEffect',
        match: effectMatch[0],
        line,
        hasAPICall,
        blockContent,
        dependencies: dependencies.trim()
      });
    }

    // Also check for simple patterns as fallback
    const simpleUseEffectMatches = content.match(/useEffect\s*\([^)]+\)/g) || [];
    simpleUseEffectMatches.forEach(match => {
      const line = this.getLineNumber(content, content.indexOf(match));
      if (!fileAnalysis.lifecycleTriggers.some(trigger => trigger.line === line)) {
        fileAnalysis.lifecycleTriggers.push({
          type: 'useEffect',
          match,
          line,
          hasAPICall: this.containsAPICall(match)
        });
      }
    });

    const simpleFocusEffectMatches = content.match(/useFocusEffect\s*\([^)]+\)/g) || [];
    simpleFocusEffectMatches.forEach(match => {
      const line = this.getLineNumber(content, content.indexOf(match));
      if (!fileAnalysis.lifecycleTriggers.some(trigger => trigger.line === line)) {
        fileAnalysis.lifecycleTriggers.push({
          type: 'useFocusEffect',
          match,
          line,
          hasAPICall: this.containsAPICall(match)
        });
        
        if (this.containsAPICall(match)) {
          this.results.focusBasedCalls.push({
            file: fileAnalysis.file,
            line,
            match
          });
        }
      }
    });
  }

  analyzeContextUsage(content, fileAnalysis) {
    this.contextPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        fileAnalysis.contextUsage.push({
          type: match[1] || match[0],
          match: match[0],
          line: this.getLineNumber(content, match.index)
        });
      }
    });
  }

  identifyProblematicPatterns(content, fileAnalysis) {
    // Check for duplicate API calls (same endpoint called multiple times)
    const endpoints = fileAnalysis.apiCalls.map(call => call.endpoint);
    const duplicates = endpoints.filter((endpoint, index) => endpoints.indexOf(endpoint) !== index);
    
    if (duplicates.length > 0) {
      this.results.duplicateCalls.push({
        file: fileAnalysis.file,
        duplicateEndpoints: [...new Set(duplicates)]
      });
    }

    // Check for context bypasses (direct API calls when context exists)
    const hasDirectStoreAPI = fileAnalysis.apiCalls.some(call => 
      call.endpoint && call.endpoint.includes('/api/store')
    );
    const hasStoreContext = fileAnalysis.contextUsage.some(usage => 
      usage.type.includes('StoreSettings')
    );
    
    if (hasDirectStoreAPI && !hasStoreContext) {
      this.results.contextBypasses.push({
        file: fileAnalysis.file,
        type: 'store',
        issue: 'Direct /api/store call without using StoreSettingsContext'
      });
    }

    // Similar checks for other contexts
    const hasDirectSubscriptionAPI = fileAnalysis.apiCalls.some(call => 
      call.endpoint && call.endpoint.includes('/api/subscription')
    );
    const hasSubscriptionContext = fileAnalysis.contextUsage.some(usage => 
      usage.type.includes('Subscription')
    );
    
    if (hasDirectSubscriptionAPI && !hasSubscriptionContext) {
      this.results.contextBypasses.push({
        file: fileAnalysis.file,
        type: 'subscription',
        issue: 'Direct /api/subscription call without using SubscriptionContext'
      });
    }
  }

  containsAPICall(code) {
    return this.apiPatterns.some(pattern => {
      pattern.lastIndex = 0; // Reset regex
      return pattern.test(code);
    });
  }

  extractAPICallsFromBlock(blockContent) {
    const apiCalls = [];
    this.apiPatterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(blockContent)) !== null) {
        apiCalls.push({
          pattern: pattern.source,
          match: match[0],
          endpoint: match[1] || match[0]
        });
      }
    });
    return apiCalls;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getContext(content, index, contextLength = 100) {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + contextLength);
    return content.substring(start, end);
  }

  generateSummary() {
    const totalFiles = this.results.apiCalls.length;
    const filesWithAPICalls = this.results.apiCalls.filter(f => f.apiCalls.length > 0).length;
    const totalAPICalls = this.results.apiCalls.reduce((sum, f) => sum + f.apiCalls.length, 0);
    const focusBasedCallsCount = this.results.focusBasedCalls.length;
    const duplicateCallsCount = this.results.duplicateCalls.length;
    const contextBypassesCount = this.results.contextBypasses.length;

    this.results.summary = {
      totalFiles,
      filesWithAPICalls,
      totalAPICalls,
      focusBasedCallsCount,
      duplicateCallsCount,
      contextBypassesCount,
      screenFiles: this.results.apiCalls.filter(f => f.isScreen).length,
      componentFiles: this.results.apiCalls.filter(f => f.isComponent).length,
      serviceFiles: this.results.apiCalls.filter(f => f.isService).length,
      hookFiles: this.results.apiCalls.filter(f => f.isHook).length
    };
  }

  async generateReport() {
    this.generateSummary();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      detailedFindings: {
        focusBasedCalls: this.results.focusBasedCalls,
        duplicateCalls: this.results.duplicateCalls,
        contextBypasses: this.results.contextBypasses
      },
      fileAnalysis: this.results.apiCalls.filter(f => f.apiCalls.length > 0 || f.lifecycleTriggers.length > 0),
      recommendations: this.generateRecommendations()
    };

    // Write detailed report
    const reportPath = path.join(process.cwd(), 'scripts', 'api-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Write human-readable summary
    const summaryPath = path.join(process.cwd(), 'scripts', 'api-audit-summary.md');
    fs.writeFileSync(summaryPath, this.generateMarkdownSummary(report));

    console.log('API Audit Complete!');
    console.log(`Detailed report: ${reportPath}`);
    console.log(`Summary report: ${summaryPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.focusBasedCalls.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Focus-based API calls',
        count: this.results.focusBasedCalls.length,
        description: 'Remove useFocusEffect API calls that cause unnecessary refetching',
        files: this.results.focusBasedCalls.map(call => call.file)
      });
    }

    if (this.results.duplicateCalls.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Duplicate API calls',
        count: this.results.duplicateCalls.length,
        description: 'Eliminate duplicate API calls within the same component',
        files: this.results.duplicateCalls.map(call => call.file)
      });
    }

    if (this.results.contextBypasses.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Context bypasses',
        count: this.results.contextBypasses.length,
        description: 'Replace direct API calls with context usage',
        files: this.results.contextBypasses.map(bypass => bypass.file)
      });
    }

    return recommendations;
  }

  generateMarkdownSummary(report) {
    return `# API Audit Summary Report

Generated: ${report.timestamp}

## Overview

- **Total Files Analyzed**: ${report.summary.totalFiles}
- **Files with API Calls**: ${report.summary.filesWithAPICalls}
- **Total API Calls Found**: ${report.summary.totalAPICalls}

## File Breakdown

- **Screen Files**: ${report.summary.screenFiles}
- **Component Files**: ${report.summary.componentFiles}
- **Service Files**: ${report.summary.serviceFiles}
- **Hook Files**: ${report.summary.hookFiles}

## Issues Identified

### 🔴 Focus-based API Calls: ${report.summary.focusBasedCallsCount}
${report.detailedFindings.focusBasedCalls.map(call => 
  `- \`${call.file}\` (line ${call.line})`
).join('\n')}

### 🔴 Duplicate API Calls: ${report.summary.duplicateCallsCount}
${report.detailedFindings.duplicateCalls.map(call => 
  `- \`${call.file}\`: ${call.duplicateEndpoints.join(', ')}`
).join('\n')}

### 🟡 Context Bypasses: ${report.summary.contextBypassesCount}
${report.detailedFindings.contextBypasses.map(bypass => 
  `- \`${bypass.file}\`: ${bypass.issue}`
).join('\n')}

## Recommendations

${report.recommendations.map(rec => 
  `### ${rec.priority}: ${rec.category} (${rec.count} issues)
${rec.description}

**Affected Files:**
${rec.files.map(file => `- ${file}`).join('\n')}
`
).join('\n')}

## Next Steps

1. Review focus-based API calls and remove unnecessary useFocusEffect triggers
2. Eliminate duplicate API calls within components
3. Replace direct API calls with appropriate context usage
4. Add simple guards for rapid remount scenarios
5. Verify user-triggered actions remain unaffected

---

*This report was generated by the API Audit Script for FlowPOS Phase 1 Optimization*
`;
  }
}

// Main execution
async function main() {
  console.log('Starting API Audit for FlowPOS Phase 1 Optimization...');
  
  const auditor = new APIAuditor();
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error('Source directory not found:', srcPath);
    process.exit(1);
  }
  
  await auditor.auditDirectory(srcPath);
  const report = await auditor.generateReport();
  
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Files analyzed: ${report.summary.totalFiles}`);
  console.log(`API calls found: ${report.summary.totalAPICalls}`);
  console.log(`Focus-based calls: ${report.summary.focusBasedCallsCount}`);
  console.log(`Duplicate calls: ${report.summary.duplicateCallsCount}`);
  console.log(`Context bypasses: ${report.summary.contextBypassesCount}`);
  
  return report;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { APIAuditor };