// Simple test to verify imports work
console.log('🧪 Starting simple test...\n');

try {
  const { CodeExtractor } = await import('./src/parser/extractor.js');
  console.log('✓ CodeExtractor imported');
  
  const { CodebaseIndexer } = await import('./src/indexer/indexer.js');
  console.log('✓ CodebaseIndexer imported');
  
  const { DuplicateDetector } = await import('./src/analysis/duplicates.js');
  console.log('✓ DuplicateDetector imported');
  
  const { BreakingChangeDetector } = await import('./src/analysis/breaking.js');
  console.log('✓ BreakingChangeDetector imported');
  
  // Test instantiation
  const extractor = new CodeExtractor();
  console.log('✓ CodeExtractor instantiated');
  
  const testCode = `public class Test { public void method() {} }`;
  const parsed = extractor.extractFromJava(testCode, 'Test.java');
  console.log(`✓ Extracted ${parsed.symbols.length} symbols`);
  
  console.log('\n✅ All imports and basic functionality work!');
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}








