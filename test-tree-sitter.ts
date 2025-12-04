/**
 * Test Tree-sitter parser implementation
 */

import { CodeExtractor } from './src/parser/extractor.js';

const testCode = `
package com.example;

public class Calculator {
    private int value;
    
    public Calculator(int initialValue) {
        this.value = initialValue;
    }
    
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
    
    private void validate(int num) {
        if (num < 0) {
            throw new IllegalArgumentException("Negative not allowed");
        }
    }
    
    public static int multiply(int a, int b) {
        return a * b;
    }
}
`;

console.log('🧪 Testing Tree-sitter Parser...\n');

try {
    const extractor = new CodeExtractor();
    // Use sync method (works without tree-sitter)
    const parsed = extractor.extractFromJavaSync(testCode, 'Calculator.java');
    
    console.log(`✅ Parsed successfully!`);
    console.log(`   Language: ${parsed.language}`);
    console.log(`   Symbols found: ${parsed.symbols.length}\n`);
    
    console.log('📋 Extracted Symbols:');
    parsed.symbols.forEach((symbol, index) => {
        console.log(`\n${index + 1}. ${symbol.type.toUpperCase()}: ${symbol.name}`);
        console.log(`   File: ${symbol.file}`);
        console.log(`   Lines: ${symbol.startLine}-${symbol.endLine}`);
        if (symbol.type === 'method') {
            console.log(`   Signature: ${symbol.signature}`);
            console.log(`   Return Type: ${symbol.returnType}`);
            console.log(`   Visibility: ${symbol.visibility}`);
            console.log(`   Static: ${symbol.isStatic || false}`);
            if (symbol.parameters && symbol.parameters.length > 0) {
                console.log(`   Parameters: ${symbol.parameters.map(p => `${p.type} ${p.name}`).join(', ')}`);
            }
        }
    });
    
    // Test call extraction
    console.log('\n🔗 Testing Call Extraction...');
    const calls = extractor.extractCallsSync(testCode, parsed.symbols);
    console.log(`   Found ${calls.length} call relationships`);
    calls.forEach(call => {
        console.log(`   ${call.caller}() -> ${call.callee}() (line ${call.line})`);
    });
    
    console.log('\n✅ Tree-sitter parser test completed!');
} catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}

