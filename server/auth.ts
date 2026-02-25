import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import type { InsertUser } from "@shared/schema";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must contain uppercase, lowercase, a number, and a special character";
  }
  return null;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
    practiceId: string;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password, practiceId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email, practiceId);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: "Password not set for this account" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is disabled" });
      }

      req.session.userId = user.id;
      req.session.practiceId = user.practiceId;

      await storage.updateUserLastLogin(user.id);

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        res.json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          practiceId: user.practiceId,
          isPracticeManager: user.isPracticeManager,
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, practiceId } = req.body;

      if (!email || !password || !name || !practiceId) {
        return res.status(400).json({ error: "Email, password, name, and practice are required" });
      }

      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const existingUser = await storage.getUserByEmail(email, practiceId);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email,
        name,
        practiceId,
        passwordHash,
        role: 'reception',
        isPracticeManager: false,
        isActive: true,
      });

      req.session.userId = user.id;
      req.session.practiceId = user.practiceId;

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        practiceId: user.practiceId,
        isPracticeManager: user.isPracticeManager,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId, req.session.practiceId!);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }

      const practice = await storage.getPractice(user.practiceId);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        practiceId: user.practiceId,
        isPracticeManager: user.isPracticeManager,
        practice: practice ? { id: practice.id, name: practice.name, country: practice.country } : null,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
