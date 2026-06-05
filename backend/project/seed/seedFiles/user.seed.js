import { User } from "../../models/user.js";
import users from "./users.json" with { type: "json" };

export async function seedUsers() {
    await User.deleteMany({});
    console.log("Deleted existing users");

    const userDocs = users.map(userPojo => new User(userPojo));
    await Promise.all(userDocs.map(u => u.save()));
    console.log(`Inserted ${userDocs.length} users`);
}
