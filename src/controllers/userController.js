// src/controllers/userController.js
class UserController {
    constructor(userService) {
      this.userService = userService;
    }
  
    async register(req, res) {
      try {
        const { email, password, fullName, dateOfBirth } = req.body;
        const user = await this.userService.registerUser({
          email,
          password,
          fullName,
          dateOfBirth,
        });
        // Por ejemplo, usar un JWT desde utils
        res.json({ user });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  }
  
  export default UserController;
  