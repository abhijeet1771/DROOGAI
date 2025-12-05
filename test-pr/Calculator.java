package com.example;

import java.util.ArrayList;
import java.util.List;

/**
 * Calculator class with various issues for testing Droog AI
 */
public class Calculator {
    
    // Issue: Magic number
    private static final int MAX_VALUE = 1000;
    
    /**
     * Issue: Potential StackOverflowError for negative numbers
     * Issue: No overflow check
     * Suggestion: Use iterative approach with Stream API
     */
    public int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
    
    /**
     * Issue: O(n^2) performance - string concatenation in loop
     * Suggestion: Use String.join() or StringBuilder
     */
    public String concatenateNumbers(List<Integer> numbers) {
        String result = "";
        for (int num : numbers) {
            result += num + ",";
        }
        return result;
    }
    
    /**
     * Issue: Missing null check
     * Issue: Potential NullPointerException
     * Suggestion: Use Optional
     */
    public int sum(List<Integer> numbers) {
        int total = 0;
        for (int num : numbers) {
            total += num;
        }
        return total;
    }
    
    /**
     * Issue: No overflow check
     * Issue: Can cause integer overflow
     */
    public int power(int base, int exponent) {
        int result = 1;
        for (int i = 0; i < exponent; i++) {
            result *= base;
        }
        return result;
    }
    
    /**
     * Issue: Dead code (unused method)
     */
    private void unusedMethod() {
        System.out.println("This is never called");
    }
    
    /**
     * Issue: Hardcoded value (magic number)
     */
    public boolean isValid(int value) {
        return value > 0 && value < 1000;
    }
}




