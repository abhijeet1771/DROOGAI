public class OrderProcessor {
    // Bad practice: Using mutable static
    private static int totalOrders = 0;
    
    // Magic number
    private static final int MAX_ORDERS = 100;
    
    // Bad practice: Not using modern Java time API
    public void processOrder(Order order) {
        Date now = new Date();
        order.setProcessedAt(now);
        totalOrders++;
        
        // Magic number
        if (totalOrders > 100) {
            System.out.println("Limit reached");
        }
    }
    
    // Duplicate code - same validation pattern
    public boolean canProcess(Order order) {
        if (order.getAmount() > 0 && order.getCustomer() != null) {
            return true;
        }
        return false;
    }
    
    // Another duplicate validation
    public boolean isValid(Order order) {
        if (order.getAmount() > 0 && order.getCustomer() != null) {
            return true;
        }
        return false;
    }
    
    // Bad practice: Not using streams
    public List<Order> getLargeOrders(List<Order> orders) {
        List<Order> largeOrders = new ArrayList<>();
        for (int i = 0; i < orders.size(); i++) {
            Order o = orders.get(i);
            if (o.getAmount() > 1000) { // Magic number
                largeOrders.add(o);
            }
        }
        return largeOrders;
    }
}




