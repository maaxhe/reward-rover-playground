import jwt from "jsonwebtoken";
import { statements } from "../db.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
};

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    // The token outlives a deleted account by up to 7 days, and a role may have changed: trust the database.
    const user = statements.getUserById.get(payload.id);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: user.id, username: user.username, role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export { authenticate, getJwtSecret };
