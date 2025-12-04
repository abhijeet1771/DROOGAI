package com.example.security;

import java.sql.Connection;
import java.sql.Statement;

/**
 * SecurityService with security issues for testing
 */
public class SecurityService {
    
    // Issue: Hardcoded secret (security vulnerability)
    private static final String API_KEY = "sk-1234567890abcdef";
    
    // Issue: Hardcoded password
    private String dbPassword = "admin123";
    
    /**
     * Issue: SQL Injection vulnerability
     * Issue: No parameterized query
     */
    public void getUserData(String userId) {
        String query = "SELECT * FROM users WHERE id = " + userId;
        // This is vulnerable to SQL injection
    }
    
    /**
     * Issue: No input validation
     * Issue: Potential XSS if used in web context
     */
    public String processUserInput(String input) {
        return "<div>" + input + "</div>";
    }
    
    /**
     * Issue: Resource leak - connection not closed
     * Issue: No try-with-resources
     */
    public void executeQuery(Connection conn) {
        try {
            Statement stmt = conn.createStatement();
            stmt.executeQuery("SELECT * FROM users");
            // Connection not closed
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    /**
     * Issue: Exception swallowed
     * Issue: No proper error handling
     */
    public void riskyOperation() {
        try {
            // Some risky operation
            int result = 10 / 0;
        } catch (Exception e) {
            // Exception swallowed - bad practice
        }
    }
}



