public class UserService {
    private List<User> users = new ArrayList<>();
    
    // Bad practice: Using magic number
    public User getUserById(int id) {
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getId() == id) {
                return users.get(i);
            }
        }
        return null;
    }
    
    // Bad practice: Not using modern Java features
    public List<String> getUserNames() {
        List<String> names = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            names.add(users.get(i).getName());
        }
        return names;
    }
    
    // Duplicate code pattern - same loop structure as above
    public List<Integer> getUserIds() {
        List<Integer> ids = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            ids.add(users.get(i).getId());
        }
        return ids;
    }
    
    // Bad practice: Using var instead of proper type
    public void addUser(User user) {
        var name = user.getName();
        var id = user.getId();
        // Magic number
        if (id > 1000) {
            users.add(user);
        }
    }
    
    // Duplicate validation logic
    public boolean validateUser(User user) {
        if (user.getId() > 1000 && user.getName() != null) {
            return true;
        }
        return false;
    }
    
    // Another duplicate validation
    public boolean isValidUser(User user) {
        if (user.getId() > 1000 && user.getName() != null) {
            return true;
        }
        return false;
    }
}








