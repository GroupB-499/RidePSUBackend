class User {
    constructor(userId, name, email, phone, password, role) {
      this.userId = userId;
      this.name = name;
      this.email = email;
      this.phone = phone;
      this.password = password;
      this.role = role;
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
      };
    }
  }
  
  module.exports = User;
  