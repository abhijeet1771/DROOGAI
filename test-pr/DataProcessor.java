package com.example.processor;

import java.util.ArrayList;
import java.util.List;

/**
 * DataProcessor with duplicate code and performance issues
 */
public class DataProcessor {
    
    /**
     * Issue: Duplicate code pattern
     * This method has similar logic to processData2 and processData3
     */
    public List<String> processData1(List<String> data) {
        List<String> result = new ArrayList<>();
        for (String item : data) {
            if (item != null && !item.isEmpty()) {
                result.add(item.trim().toUpperCase());
            }
        }
        return result;
    }
    
    /**
     * Issue: Duplicate code (similar to processData1)
     * This will be detected as duplicate
     */
    public List<String> processData2(List<String> data) {
        List<String> result = new ArrayList<>();
        for (String item : data) {
            if (item != null && !item.isEmpty()) {
                result.add(item.trim().toUpperCase());
            }
        }
        return result;
    }
    
    /**
     * Issue: Duplicate code (similar to processData1 and processData2)
     * This will be detected as duplicate
     */
    public List<String> processData3(List<String> data) {
        List<String> result = new ArrayList<>();
        for (String item : data) {
            if (item != null && !item.isEmpty()) {
                result.add(item.trim().toUpperCase());
            }
        }
        return result;
    }
    
    /**
     * Issue: O(n^2) performance
     * Issue: Nested loops
     */
    public List<String> findDuplicates(List<String> list1, List<String> list2) {
        List<String> duplicates = new ArrayList<>();
        for (String item1 : list1) {
            for (String item2 : list2) {
                if (item1.equals(item2)) {
                    duplicates.add(item1);
                }
            }
        }
        return duplicates;
    }
}







