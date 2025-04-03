import bcrypt from 'bcrypt';

const generateHash = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

export default generateHash;