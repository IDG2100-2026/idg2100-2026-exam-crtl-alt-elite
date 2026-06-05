import { User } from "../models/user.js";

export async function findUserById(id) {
    return await User.findOne({ userId: Number(id) });
}

export function buildSearchFilter(search) {
    return search
        ? { $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ]}
        : {};
}

export function applyUserUpdates(user, { email, pwd, age, aboutMe }) {
    if (email) user.email = email;
    if (pwd) user.pwd = pwd;
    if (age) user.age = age;
    if (aboutMe !== undefined) user.aboutMe = aboutMe;
}

export default {
    findUserById,
    buildSearchFilter,
    applyUserUpdates
};
