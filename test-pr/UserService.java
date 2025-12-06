package com.example.service;

import java.util.ArrayList;
import java.util.List;

/**
 * UserService with various issues for testing
 */
public class UserService {
    
    private List<User> users = new ArrayList<>();
    
    /**
     * Issue: Missing bounds check
     * Issue: Potential IndexOutOfBoundsException
     */
    public User getUserById(int id) {
        return users.get(id);
    }
    
    /**
     * Issue: Missing null check
     * Issue: Missing bounds check
     * Suggestion: Use Optional
     */
    public void updateUserName(int id, String newName) {
        users.get(id).setName(newName);
    }
    
    /**
     * Issue: O(n) operation when O(1) available
     * Suggestion: Use size() instead
     */
    public int getUserCount() {
        int count = 0;
        for (User user : users) {
            count++;
        }
        return count;
    }
    
    /**
     * Issue: Missing null check
     * Issue: Potential NullPointerException
     */
    public void addUser(User user) {
        users.add(user);
    }
    
    /**
     * Issue: Inefficient search
     * Suggestion: Use Stream API with Optional
     */
    public User findUserByName(String name) {
        for (User user : users) {
            if (user.getName().equals(name)) {
                return user;
            }
        }
        return null;
    }
    
    /**
     * Issue: Duplicate code (similar to findUserByName)
     * This will be detected as duplicate
     */
    public User findUserByEmail(String email) {
        for (User user : users) {
            if (user.getEmail().equals(email)) {
                return user;
            }
        }
        return null;
    }
}

class User {
    private String name;
    private String email;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}







