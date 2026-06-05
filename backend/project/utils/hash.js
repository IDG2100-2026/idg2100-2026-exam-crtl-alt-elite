import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { PWD_HASH_KEYLEN } from "../config/constants.js";

export function hashPwd(pwd) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pwd, salt, PWD_HASH_KEYLEN).toString("hex");
    return `${salt}:${hash}`;
}

export function checkPwd(pwd, storedHash) {
    const [salt, hash] = storedHash.split(":");
    const hashedInput = scryptSync(pwd, salt, PWD_HASH_KEYLEN);
    const storedBuffer = Buffer.from(hash, "hex");
    return timingSafeEqual(hashedInput, storedBuffer);
}
