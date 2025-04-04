class User {
    constructor(userId, name, email, phone, password, role, enabled) {
      this.userId = userId;
      this.name = name;
      this.email = email;
      this.phone = phone;
      this.password = password;
      this.role = role;
      this.enabled = enabled;
      this.createdAt = new Date().toISOString();
    }
  
    toFirestore() {
      return {
        userId: this.userId,
        name: this.name,
        email: this.email,
        phone: this.phone,
        password: this.password,
        role: this.role,
        createdAt: this.createdAt,
        enabled: this.enabled,
      };
    }
  }
  
  module.exports = User;
  