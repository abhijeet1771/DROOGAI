public class ProductService {
    private List<Product> products = new ArrayList<>();
    
    // Bad practice: Using old-style iteration
    public Product findProduct(String name) {
        for (int i = 0; i < products.size(); i++) {
            Product p = products.get(i);
            if (p.getName().equals(name)) {
                return p;
            }
        }
        return null;
    }
    
    // Bad practice: Not using Optional
    public Product getProductById(int id) {
        for (int i = 0; i < products.size(); i++) {
            if (products.get(i).getId() == id) {
                return products.get(i);
            }
        }
        return null;
    }
    
    // Magic number
    public double calculateDiscount(double price) {
        return price * 0.1; // What is 0.1?
    }
    
    // Duplicate code - same pattern as UserService.getUserById
    public Product findById(int id) {
        for (int i = 0; i < products.size(); i++) {
            if (products.get(i).getId() == id) {
                return products.get(i);
            }
        }
        return null;
    }
    
    // Bad practice: Using == for string comparison
    public boolean hasProduct(String name) {
        for (int i = 0; i < products.size(); i++) {
            if (products.get(i).getName() == name) {
                return true;
            }
        }
        return false;
    }
}





