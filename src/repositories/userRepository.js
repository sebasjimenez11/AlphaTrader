import User from "../database/models/user.js";

class UserRepository {
  async findById(id) {
    return await User.findByPk(id);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { Email: email } });
  }

  async create(data) {
    return await User.create(data);
  }

  async updateById(id, data) {
    return await User.update(data, { where: { ID: id } });
  }

  async deleteUser(id) {
    return await User.destroy({ where: { ID: id } });
  }
}

export default new UserRepository();
