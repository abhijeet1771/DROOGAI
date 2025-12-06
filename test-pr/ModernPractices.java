package com.example.modern;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Class that needs modern Java practices
 */
public class ModernPractices {
    
    /**
     * Issue: Should use Stream API instead of manual loop
     * Suggestion: Use Stream API for functional style
     */
    public List<Integer> filterEvenNumbers(List<Integer> numbers) {
        List<Integer> result = new ArrayList<>();
        for (Integer num : numbers) {
            if (num % 2 == 0) {
                result.add(num);
            }
        }
        return result;
    }
    
    /**
     * Issue: Should use Optional instead of null
     * Issue: Returns null
     * Suggestion: Return Optional<String>
     */
    public String findValue(String key) {
        // Some logic
        return null; // Should return Optional
    }
    
    /**
     * Issue: Should use Records for data carrier
     * This class should be a Record
     */
    public static class Person {
        private final String name;
        private final int age;
        
        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        public String getName() { return name; }
        public int getAge() { return age; }
    }
    
    /**
     * Issue: Should use List.of() for immutable collections
     * Issue: Mutable list created
     */
    public List<String> getDefaultValues() {
        List<String> values = new ArrayList<>();
        values.add("value1");
        values.add("value2");
        return values;
    }
    
    /**
     * Issue: Should use String methods like isBlank()
     * Issue: Manual null/empty check
     */
    public boolean isValid(String input) {
        return input != null && !input.isEmpty() && !input.trim().isEmpty();
    }
}







