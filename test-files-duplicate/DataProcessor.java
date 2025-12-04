public class DataProcessor {
    
    // DUPLICATE: Same find-by-id pattern as UserService and ProductService
    public User findUserById(int id) {
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getId() == id) {
                return users.get(i);
            }
        }
        return null;
    }
    
    // DUPLICATE: Same find-by-id pattern
    public Product findProductById(int id) {
        for (int i = 0; i < products.size(); i++) {
            if (products.get(i).getId() == id) {
                return products.get(i);
            }
        }
        return null;
    }
    
    // DUPLICATE: Same find-by-id pattern
    public Order findOrderById(int id) {
        for (int i = 0; i < orders.size(); i++) {
            if (orders.get(i).getId() == id) {
                return orders.get(i);
            }
        }
        return null;
    }
    
    // DUPLICATE: Same null check pattern repeated
    public String processData1(String data) {
        if (data == null) {
            return "";
        }
        if (data.isEmpty()) {
            return "";
        }
        return data.trim().toUpperCase();
    }
    
    // DUPLICATE: Same null check pattern
    public String processData2(String data) {
        if (data == null) {
            return "";
        }
        if (data.isEmpty()) {
            return "";
        }
        return data.trim().toLowerCase();
    }
    
    // DUPLICATE: Same null check pattern
    public String processData3(String data) {
        if (data == null) {
            return "";
        }
        if (data.isEmpty()) {
            return "";
        }
        return data.trim();
    }
}




