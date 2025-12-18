import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { InsertUser } from "@shared/schema";

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
      secure: true,
      sameSite: 'none',
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

  app.post("/api/auth/login", async (req, res) => {
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

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        practiceId: user.practiceId,
        isPracticeManager: user.isPracticeManager,
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

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
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
