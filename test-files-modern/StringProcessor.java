import java.util.*;

public class StringProcessor {
    
    // BAD: Manual string checking
    public boolean isBlank(String str) {
        if (str == null) {
            return true;
        }
        if (str.trim().length() == 0) {
            return true;
        }
        return false;
    }
    
    // BAD: Manual string splitting and processing
    public List<String> processLines(String text) {
        List<String> lines = new ArrayList<>();
        String[] parts = text.split("\n");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                lines.add(trimmed);
            }
        }
        return lines;
    }
    
    // BAD: Manual string building
    public String joinNames(List<String> names) {
        if (names.isEmpty()) {
            return "";
        }
        String result = names.get(0);
        for (int i = 1; i < names.size(); i++) {
            result += ", " + names.get(i);
        }
        return result;
    }
    
    // BAD: Manual string formatting
    public String formatMessage(String name, int age) {
        return "Name: " + name + ", Age: " + age;
    }
    
    // BAD: Manual null checking
    public String getValue(Map<String, String> map, String key) {
        if (map.containsKey(key)) {
            return map.get(key);
        }
        return null;
    }
    
    // BAD: Manual empty check
    public boolean isEmpty(Collection<?> collection) {
        if (collection == null) {
            return true;
        }
        return collection.size() == 0;
    }
}





