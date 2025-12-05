package com.example.api;

/**
 * Class with breaking changes for testing
 */
public class BreakingChanges {
    
    /**
     * BREAKING CHANGE: Method signature changed
     * Old: public int calculate(int a, int b)
     * New: public int calculate(int a, int b, int c)
     * 
     * This will be detected as breaking change
     */
    public int calculate(int a, int b, int c) {
        return a + b + c;
    }
    
    /**
     * BREAKING CHANGE: Return type changed
     * Old: public String getName()
     * New: public int getName()
     * 
     * This will be detected as breaking change
     */
    public int getName() {
        return 42;
    }
    
    /**
     * BREAKING CHANGE: Visibility changed
     * Old: public void process()
     * New: private void process()
     * 
     * This will be detected as breaking change
     */
    private void process() {
        // Implementation
    }
    
    /**
     * BREAKING CHANGE: Method removed
     * This method was public before, now it's removed
     * (simulated by not having the old method)
     */
    // Old method: public void oldMethod() { }
    // This method no longer exists
}




