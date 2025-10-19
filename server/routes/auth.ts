import { Router } from "express";
import bcrypt from "bcrypt";
import Joi from "joi";
import { requireAuth, optionalAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";

const router = Router();

// Input validation schemas
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
});

// Authentication routes
router.post("/signup", async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password } = value;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create user in our database
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email,
      username,
      passwordHash,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      }
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user from database
    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Set session
    if (req.session) {
      req.session.userId = user.id;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Password reset endpoint (basic implementation - would need email service in production)
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    }

    // In a real implementation, generate a reset token, store it in DB with expiry,
    // and send an email with the reset link
    // For now, just return success message
    console.log(`Password reset requested for: ${email}`);

    res.json({ message: "If an account with that email exists, a password reset link has been sent." });
  } catch (error: any) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to process password reset" });
  }
});

export default router;
