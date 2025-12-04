public class CalculatorService {
    
    // DUPLICATE: Same calculation pattern with different operations
    public int add(int a, int b) {
        if (a < 0 || b < 0) {
            throw new IllegalArgumentException("Negative numbers not allowed");
        }
        int result = a + b;
        if (result < 0) {
            throw new ArithmeticException("Overflow detected");
        }
        return result;
    }
    
    // DUPLICATE: Same validation pattern, different operation
    public int subtract(int a, int b) {
        if (a < 0 || b < 0) {
            throw new IllegalArgumentException("Negative numbers not allowed");
        }
        int result = a - b;
        if (result < 0) {
            throw new ArithmeticException("Underflow detected");
        }
        return result;
    }
    
    // DUPLICATE: Same validation pattern, different operation
    public int multiply(int a, int b) {
        if (a < 0 || b < 0) {
            throw new IllegalArgumentException("Negative numbers not allowed");
        }
        int result = a * b;
        if (result < 0) {
            throw new ArithmeticException("Overflow detected");
        }
        return result;
    }
    
    // DUPLICATE: Manual string building pattern
    public String buildMessage1(String name, int age) {
        String message = "Hello ";
        message += name;
        message += ", you are ";
        message += age;
        message += " years old.";
        return message;
    }
    
    // DUPLICATE: Same string building pattern
    public String buildMessage2(String product, double price) {
        String message = "Product: ";
        message += product;
        message += ", Price: $";
        message += price;
        message += ".";
        return message;
    }
    
    // DUPLICATE: Same string building pattern
    public String buildMessage3(String city, String country) {
        String message = "Location: ";
        message += city;
        message += ", ";
        message += country;
        message += ".";
        return message;
    }
}




