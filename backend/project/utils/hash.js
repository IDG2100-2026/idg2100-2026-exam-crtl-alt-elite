// No longer a copy from inclass code
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { PWD_HASH_KEYLEN } from "../config/constants.js";

// Hashes a password with a randomly generated salt
// Returns a string in the format "salt:hash" so both can be stored together
export function hashPwd(pwd) {
    const salt = randomBytes(16).toString("hex"); // Random salt, unique per password
    const hash = scryptSync(pwd, salt, PWD_HASH_KEYLEN).toString("hex");
    return `${salt}:${hash}`;
}

// Compares a plain text password against a stored "salt:hash" string
// Uses timingSafeEqual to prevent timing attacks
export function checkPwd(pwd, storedHash) {
    const [salt, hash] = storedHash.split(":");
    const hashedInput = scryptSync(pwd, salt, PWD_HASH_KEYLEN);
    const storedBuffer = Buffer.from(hash, "hex");
    return timingSafeEqual(hashedInput, storedBuffer);
}