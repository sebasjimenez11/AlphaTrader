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
    const includes = []; // Puedes agregar relaciones si necesitas, como { model: Role } por ejemplo

    const [numberOfAffectedRows] = await User.update(data, {
      where: { ID: id },
    });

    if (numberOfAffectedRows === 0) {
      return null; // No se encontró el usuario con ese ID
    }

    const updatedUser = await User.findOne({
      where: { ID: id },
      include: includes,
    });

    return updatedUser;
  }


  async deleteUser(id) {
    return await User.destroy({ where: { ID: id } });
  }
}

export default new UserRepository();
