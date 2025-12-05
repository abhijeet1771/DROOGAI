package com.example.violations;

import com.example.service.UserService;
import com.example.security.SecurityService;
import com.example.processor.DataProcessor;

/**
 * Class with architecture violations for testing
 */
public class ArchitectureViolations {
    
    /**
     * Issue: Circular dependency potential
     * Issue: Importing from multiple layers
     */
    private UserService userService;
    private SecurityService securityService;
    private DataProcessor dataProcessor;
    
    /**
     * Issue: Violation of single responsibility
     * This class does too many things
     */
    public void doEverything() {
        // User management
        userService = new UserService();
        
        // Security
        securityService = new SecurityService();
        
        // Data processing
        dataProcessor = new DataProcessor();
    }
    
    /**
     * Issue: Naming convention violation
     * Method name doesn't follow camelCase
     */
    public void GetUserData() {
        // Should be getUserData
    }
    
    /**
     * Issue: Magic number
     * Issue: Should use constant
     */
    public boolean checkStatus(int code) {
        return code == 200; // Magic number
    }
}




