/**
 * Basic test script to verify the code compiles and basic structure works
 * Run with: npx tsx test-basic.js
 */

import { CodeExtractor } from './src/parser/extractor.js';
import { CodebaseIndexer } from './src/indexer/indexer.js';
import { DuplicateDetector } from './src/analysis/duplicates.js';
import { BreakingChangeDetector } from './src/analysis/breaking.js';

console.log('🧪 Testing Enterprise Upgrade Components...\n');

try {
  // Test 1: Code Extractor
  console.log('✓ Testing CodeExtractor...');
  const extractor = new CodeExtractor();
  const testCode = `
    public class TestService {
      public String processData(String input) {
        return input.toUpperCase();
      }
    }
  `;
  const parsed = extractor.extractFromJava(testCode, 'TestService.java');
  console.log(`  ✓ Extracted ${parsed.symbols.length} symbols`);
  
  // Test 2: Codebase Indexer
  console.log('✓ Testing CodebaseIndexer...');
  const indexer = new CodebaseIndexer();
  indexer.indexFile('TestService.java', testCode);
  const index = indexer.getIndex();
  console.log(`  ✓ Indexed ${index.symbols.length} symbols`);
  
  // Test 3: Duplicate Detector
  console.log('✓ Testing DuplicateDetector...');
  const duplicateDetector = new DuplicateDetector(indexer);
  const duplicates = duplicateDetector.detectWithinPR(parsed.symbols);
  console.log(`  ✓ Duplicate detection working (found ${duplicates.length} duplicates)`);
  
  // Test 4: Breaking Change Detector
  console.log('✓ Testing BreakingChangeDetector...');
  const breakingDetector = new BreakingChangeDetector(indexer);
  const breakingChanges = breakingDetector.detectBreakingChanges(parsed.symbols);
  console.log(`  ✓ Breaking change detection working (found ${breakingChanges.length} breaking changes)`);
  
  // Test 5: Verify structure
  console.log('✓ All components initialized successfully');
  
  console.log('\n✅ All basic tests passed!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Test with real PR: npx tsx src/index.ts --repo owner/repo --pr 123');
  console.log('  2. Test enterprise mode: npx tsx src/index.ts review --repo owner/repo --pr 123 --enterprise');
  console.log('  3. Install dependencies: npm install');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

