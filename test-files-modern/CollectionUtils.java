import java.util.*;

public class CollectionUtils {
    
    // BAD: Manual map creation
    public Map<String, Integer> createStatusMap() {
        Map<String, Integer> map = new HashMap<>();
        map.put("ACTIVE", 1);
        map.put("INACTIVE", 2);
        map.put("PENDING", 3);
        return map;
    }
    
    // BAD: Manual set creation
    public Set<String> createStatusSet() {
        Set<String> set = new HashSet<>();
        set.add("ACTIVE");
        set.add("INACTIVE");
        set.add("PENDING");
        return set;
    }
    
    // BAD: Manual list creation
    public List<String> createStatusList() {
        List<String> list = new ArrayList<>();
        list.add("ACTIVE");
        list.add("INACTIVE");
        list.add("PENDING");
        return list;
    }
    
    // BAD: Manual transformation
    public List<Integer> getIds(List<User> users) {
        List<Integer> ids = new ArrayList<>();
        for (User user : users) {
            ids.add(user.getId());
        }
        return ids;
    }
    
    // BAD: Manual grouping
    public Map<String, List<User>> groupByStatus(List<User> users) {
        Map<String, List<User>> grouped = new HashMap<>();
        for (User user : users) {
            String status = user.getStatus();
            if (!grouped.containsKey(status)) {
                grouped.put(status, new ArrayList<>());
            }
            grouped.get(status).add(user);
        }
        return grouped;
    }
    
    // BAD: Manual filtering and mapping
    public List<String> getActiveUserEmails(List<User> users) {
        List<String> emails = new ArrayList<>();
        for (User user : users) {
            if (user.isActive()) {
                emails.add(user.getEmail());
            }
        }
        return emails;
    }
    
    // BAD: Manual reduction
    public int sumAges(List<User> users) {
        int sum = 0;
        for (User user : users) {
            sum += user.getAge();
        }
        return sum;
    }
    
    // BAD: Manual finding with exception
    public User findUser(String email) {
        for (User user : users) {
            if (user.getEmail().equals(email)) {
                return user;
            }
        }
        throw new RuntimeException("User not found");
    }
}





