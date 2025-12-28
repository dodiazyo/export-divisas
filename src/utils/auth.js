import bcrypt from "bcryptjs";

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const verifyPassword = async (password, hashOrPlain) => {
  // Check if it's a hash (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (hashOrPlain.startsWith("$2")) {
    return await bcrypt.compare(password, hashOrPlain);
  }
  // Legacy plain text check
  return password === hashOrPlain;
};
