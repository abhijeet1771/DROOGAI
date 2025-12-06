public class ValidationUtils {
    
    // DUPLICATE METHOD 1 - Same validation logic repeated
    public static boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        if (!email.contains("@")) {
            return false;
        }
        if (email.length() < 5) {
            return false;
        }
        return true;
    }
    
    // DUPLICATE METHOD 2 - Exact same pattern as isValidEmail
    public static boolean validateEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        if (!email.contains("@")) {
            return false;
        }
        if (email.length() < 5) {
            return false;
        }
        return true;
    }
    
    // DUPLICATE METHOD 3 - Same validation pattern for phone
    public static boolean isValidPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return false;
        }
        if (!phone.contains("-")) {
            return false;
        }
        if (phone.length() < 10) {
            return false;
        }
        return true;
    }
    
    // DUPLICATE METHOD 4 - Same pattern as isValidPhone
    public static boolean validatePhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return false;
        }
        if (!phone.contains("-")) {
            return false;
        }
        if (phone.length() < 10) {
            return false;
        }
        return true;
    }
    
    // DUPLICATE LOOP PATTERN 1
    public static List<String> filterEmptyStrings(List<String> list) {
        List<String> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            String item = list.get(i);
            if (item != null && !item.isEmpty()) {
                result.add(item);
            }
        }
        return result;
    }
    
    // DUPLICATE LOOP PATTERN 2 - Same structure as filterEmptyStrings
    public static List<Integer> filterNegativeNumbers(List<Integer> list) {
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            Integer item = list.get(i);
            if (item != null && item > 0) {
                result.add(item);
            }
        }
        return result;
    }
    
    // DUPLICATE LOOP PATTERN 3 - Same structure again
    public static List<Double> filterSmallNumbers(List<Double> list) {
        List<Double> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i++) {
            Double item = list.get(i);
            if (item != null && item > 10.0) {
                result.add(item);
            }
        }
        return result;
    }
}








