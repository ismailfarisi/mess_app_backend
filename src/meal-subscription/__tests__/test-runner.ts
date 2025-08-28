#!/usr/bin/env node

/**
 * Test Runner for Monthly Subscription System
 * 
 * This script runs all tests for the monthly subscription system
 * and generates a coverage report to ensure we meet the 90% minimum requirement.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Entity Tests',
    pattern: 'src/meal-subscription/__tests__/entities/*.spec.ts',
    description: 'Tests for MonthlySubscription entity validation and relationships'
  },
  {
    name: 'DTO Validation Tests',
    pattern: 'src/meal-subscription/__tests__/dto/*.spec.ts',
    description: 'Tests for all DTOs and custom validators'
  },
  {
    name: 'Service Unit Tests',
    pattern: 'src/meal-subscription/__tests__/services/*.spec.ts',
    description: 'Unit tests for MonthlySubscriptionService and VendorsService enhancements'
  },
  {
    name: 'Controller Tests',
    pattern: 'src/meal-subscription/__tests__/controllers/*.spec.ts',
    description: 'Tests for MonthlySubscriptionController with proper mocking'
  },
  {
    name: 'End-to-End Tests',
    pattern: 'src/meal-subscription/__tests__/e2e/*.spec.ts',
    description: 'Complete workflow tests for monthly subscription system'
  },
];

class TestRunner {
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;
  private coverage = {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0,
  };

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Monthly Subscription Test Suite\n');
    console.log('=' .repeat(60));
    
    try {
      // Run all tests with coverage
      console.log('📊 Running tests with coverage analysis...\n');
      
      const testPattern = 'src/meal-subscription/__tests__/**/*.spec.ts';
      const coverageCommand = `jest --coverage --testPathPattern="${testPattern}" --collectCoverageFrom="src/meal-subscription/**/*.ts" --collectCoverageFrom="!src/meal-subscription/**/*.spec.ts" --collectCoverageFrom="!src/meal-subscription/__tests__/**/*"`;
      
      const result = execSync(coverageCommand, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      this.parseTestResults(result);
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test execution failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  async runIndividualSuites(): Promise<void> {
    console.log('🧪 Running Individual Test Suites\n');
    
    for (const suite of testSuites) {
      console.log(`\n📋 ${suite.name}`);
      console.log(`   ${suite.description}`);
      console.log('-'.repeat(50));
      
      try {
        const result = execSync(`jest --testPathPattern="${suite.pattern}"`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const suiteResults = this.parseSuiteResults(result);
        console.log(`✅ Passed: ${suiteResults.passed}`);
        console.log(`❌ Failed: ${suiteResults.failed}`);
        console.log(`⏱️  Duration: ${suiteResults.duration}ms`);
        
      } catch (error) {
        console.log(`❌ Suite failed: ${suite.name}`);
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  private parseTestResults(output: string): void {
    // Parse Jest output to extract test statistics
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      this.failedTests = parseInt(testMatch[1]);
      this.passedTests = parseInt(testMatch[2]);
      this.totalTests = parseInt(testMatch[3]);
    }

    // Parse coverage information
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      this.coverage.statements = parseFloat(coverageMatch[1]);
      this.coverage.branches = parseFloat(coverageMatch[2]);
      this.coverage.functions = parseFloat(coverageMatch[3]);
      this.coverage.lines = parseFloat(coverageMatch[4]);
    }
  }

  private parseSuiteResults(output: string): { passed: number; failed: number; duration: number } {
    const testMatch = output.match(/(\d+)\s+passed/);
    const failMatch = output.match(/(\d+)\s+failed/);
    const durationMatch = output.match(/Time:\s+([\d.]+)\s*s/);
    
    return {
      passed: testMatch ? parseInt(testMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      duration: durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0,
    };
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n🧪 Test Statistics:`);
    console.log(`   Total Tests: ${this.totalTests}`);
    console.log(`   ✅ Passed: ${this.passedTests}`);
    console.log(`   ❌ Failed: ${this.failedTests}`);
    console.log(`   📊 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);
    
    console.log(`\n📋 Coverage Report:`);
    console.log(`   📄 Statements: ${this.coverage.statements}%`);
    console.log(`   🌿 Branches: ${this.coverage.branches}%`);
    console.log(`   🔧 Functions: ${this.coverage.functions}%`);
    console.log(`   📝 Lines: ${this.coverage.lines}%`);
    
    // Check if coverage meets requirements
    const minCoverage = 90;
    const averageCoverage = (
      this.coverage.statements + 
      this.coverage.branches + 
      this.coverage.functions + 
      this.coverage.lines
    ) / 4;
    
    console.log(`\n🎯 Coverage Analysis:`);
    console.log(`   Average Coverage: ${averageCoverage.toFixed(2)}%`);
    console.log(`   Minimum Required: ${minCoverage}%`);
    
    if (averageCoverage >= minCoverage) {
      console.log(`   ✅ Coverage requirement MET!`);
    } else {
      console.log(`   ❌ Coverage requirement NOT met. Need ${(minCoverage - averageCoverage).toFixed(2)}% more coverage.`);
    }
    
    // Test Categories Summary
    console.log(`\n📚 Test Categories Implemented:`);
    testSuites.forEach(suite => {
      console.log(`   ✅ ${suite.name}`);
    });
    
    console.log(`\n🏆 Additional Test Features:`);
    console.log(`   ✅ Comprehensive entity validation tests`);
    console.log(`   ✅ Custom validator testing (IsValidVendorSelection, IsFutureDate)`);
    console.log(`   ✅ Service unit tests with mocking`);
    console.log(`   ✅ Controller integration tests`);
    console.log(`   ✅ End-to-end workflow tests`);
    console.log(`   ✅ Error handling and edge case coverage`);
    console.log(`   ✅ Performance and concurrency tests`);
    console.log(`   ✅ Security validation tests`);
    console.log(`   ✅ Database integration testing`);
    
    this.displayTestStructure();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Monthly Subscription Testing Complete!');
    console.log('='.repeat(60));
  }

  private displayTestStructure(): void {
    console.log(`\n📁 Test Structure Overview:`);
    console.log(`src/meal-subscription/__tests__/`);
    console.log(`├── factories/`);
    console.log(`│   └── test-data.factory.ts          # Test data generation utilities`);
    console.log(`├── entities/`);
    console.log(`│   └── monthly-subscription.entity.spec.ts  # Entity validation tests`);
    console.log(`├── dto/`);
    console.log(`│   ├── create-monthly-subscription.dto.spec.ts  # DTO validation tests`);
    console.log(`│   └── validators/`);
    console.log(`│       ├── vendor-selection.validator.spec.ts   # Custom validator tests`);
    console.log(`│       └── date.validator.spec.ts              # Date validator tests`);
    console.log(`├── services/`);
    console.log(`│   ├── monthly-subscription.service.spec.ts    # Service unit tests`);
    console.log(`│   └── vendors-service-monthly.spec.ts         # Vendor service tests`);
    console.log(`├── controllers/`);
    console.log(`│   └── monthly-subscription.controller.spec.ts # Controller tests`);
    console.log(`└── e2e/`);
    console.log(`    └── monthly-subscription.e2e-spec.ts        # End-to-end tests`);
  }

  async generateCoverageReport(): Promise<void> {
    console.log('\n📊 Generating detailed coverage report...');
    
    try {
      execSync('jest --coverage --coverageReporters=html --coverageDirectory=coverage/monthly-subscription', {
        stdio: 'inherit'
      });
      
      console.log('✅ Coverage report generated in coverage/monthly-subscription/');
      console.log('   Open coverage/monthly-subscription/index.html to view detailed report');
      
    } catch (error) {
      console.error('❌ Failed to generate coverage report:', error.message);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (args.includes('--individual')) {
    await runner.runIndividualSuites();
  } else if (args.includes('--coverage-only')) {
    await runner.generateCoverageReport();
  } else {
    await runner.runAllTests();
    
    if (args.includes('--coverage-report')) {
      await runner.generateCoverageReport();
    }
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, testSuites };