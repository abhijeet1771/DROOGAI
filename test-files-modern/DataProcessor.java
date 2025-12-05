import java.util.*;

public class DataProcessor {
    private List<User> users = new ArrayList<>();
    private List<Product> products = new ArrayList<>();
    
    // BAD: Manual loop instead of Stream API
    public List<String> getUserNames() {
        List<String> names = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            names.add(users.get(i).getName());
        }
        return names;
    }
    
    // BAD: Manual filtering with loop
    public List<User> getActiveUsers() {
        List<User> activeUsers = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            User user = users.get(i);
            if (user.isActive()) {
                activeUsers.add(user);
            }
        }
        return activeUsers;
    }
    
    // BAD: Manual counting
    public int countActiveUsers() {
        int count = 0;
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).isActive()) {
                count++;
            }
        }
        return count;
    }
    
    // BAD: Manual finding with null return
    public User findUserById(int id) {
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getId() == id) {
                return users.get(i);
            }
        }
        return null;
    }
    
    // BAD: Verbose class instead of Record
    public class UserData {
        private String name;
        private int age;
        private String email;
        
        public UserData(String name, int age, String email) {
            this.name = name;
            this.age = age;
            this.email = email;
        }
        
        public String getName() { return name; }
        public int getAge() { return age; }
        public String getEmail() { return email; }
        
        // ... equals, hashCode, toString missing
    }
    
    // BAD: Manual string building
    public String buildUserInfo(User user) {
        String info = "Name: ";
        info += user.getName();
        info += ", Age: ";
        info += user.getAge();
        info += ", Email: ";
        info += user.getEmail();
        return info;
    }
    
    // BAD: Creating mutable collections
    public List<String> getProductNames() {
        List<String> names = new ArrayList<>();
        names.add("Product1");
        names.add("Product2");
        names.add("Product3");
        return names;
    }
    
    // BAD: Old file reading approach
    public String readFile(String path) {
        // Manual file reading with try-catch-finally
        // Should use Files.readString()
        return "";
    }
    
    // BAD: Manual string operations
    public boolean isEmpty(String str) {
        if (str == null) {
            return true;
        }
        if (str.trim().length() == 0) {
            return true;
        }
        return false;
    }
}





