import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("elite241.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    pseudo TEXT,
    district TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, validated, expired
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    question TEXT,
    options TEXT, -- JSON array
    correct_index INTEGER,
    difficulty TEXT
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    score INTEGER,
    total_time REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    scheduled_at DATETIME,
    is_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('arena_open', '0');
`);

// Seed admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE is_admin = 1").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (phone, pseudo, is_admin) VALUES (?, ?, ?)").run("077000000", "Admin Elite", 1);
}

// Seed some questions if empty
const questionCount = db.prepare("SELECT COUNT(*) as count FROM questions").get() as { count: number };
if (questionCount.count === 0) {
  const seedQuestions = [
    { category: "Mathématiques", question: "Quelle est la racine carrée de 144 ?", options: JSON.stringify(["10", "12", "14", "16"]), correct_index: 1 },
    { category: "Français", question: "Quel est le synonyme de 'Célérité' ?", options: JSON.stringify(["Lenteur", "Vitesse", "Force", "Beauté"]), correct_index: 1 },
    { category: "Histoire-Géo", question: "Quelle est la capitale du Gabon ?", options: JSON.stringify(["Port-Gentil", "Franceville", "Libreville", "Oyem"]), correct_index: 2 }
  ];
  const insertQ = db.prepare("INSERT INTO questions (category, question, options, correct_index) VALUES (?, ?, ?, ?)");
  seedQuestions.forEach(q => insertQ.run(q.category, q.question, q.options, q.correct_index));
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "elite-241-secret-key";

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Ensure uploads dir exists
import fs from "fs";
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- API Routes ---

// Login/Register
app.post("/api/auth/login", (req, res) => {
  const { phone, pseudo, district } = req.body;
  let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
  
  if (!user) {
    const result = db.prepare("INSERT INTO users (phone, pseudo, district) VALUES (?, ?, ?)").run(phone, pseudo, district);
    user = { id: result.lastInsertRowid, phone, pseudo, district, is_admin: 0 };
  }
  
  const token = jwt.sign({ id: user.id, phone: user.phone, is_admin: user.is_admin }, JWT_SECRET);
  res.json({ token, user });
});

// Get Profile
app.get("/api/auth/me", authenticate, (req: any, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'validated' AND expires_at > datetime('now')").get(req.user.id);
  res.json({ user, subscription: sub });
});

// Subscription Upload
app.post("/api/subscription/upload", authenticate, upload.single("screenshot"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  db.prepare("INSERT INTO subscriptions (user_id, screenshot_url) VALUES (?, ?)").run(req.user.id, `/uploads/${req.file.filename}`);
  res.json({ success: true });
});

// Quiz Questions
app.get("/api/quiz/questions", authenticate, (req: any, res) => {
  // Check subscription
  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'validated' AND expires_at > datetime('now')").get(req.user.id);
  if (!sub && !req.user.is_admin) return res.status(403).json({ error: "Subscription required" });
  
  const questions = db.prepare("SELECT * FROM questions ORDER BY RANDOM() LIMIT 10").all();
  res.json(questions);
});

// Submit Score
app.post("/api/quiz/submit", authenticate, (req: any, res) => {
  const { score, totalTime, sessionId } = req.body;
  db.prepare("INSERT INTO scores (user_id, session_id, score, total_time) VALUES (?, ?, ?, ?)").run(req.user.id, sessionId, score, totalTime);
  res.json({ success: true });
});

// --- Admin Routes ---

app.get("/api/admin/subscriptions", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const subs = db.prepare(`
    SELECT s.*, u.phone, u.pseudo 
    FROM subscriptions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.status = 'pending'
  `).all();
  res.json(subs);
});

app.post("/api/admin/subscriptions/validate", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const { subId, action } = req.body; // action: 'validate' or 'reject'
  
  if (action === "validate") {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE subscriptions SET status = 'validated', expires_at = ? WHERE id = ?").run(expiresAt, subId);
  } else {
    db.prepare("UPDATE subscriptions SET status = 'rejected' WHERE id = ?").run(subId);
  }
  res.json({ success: true });
});

app.get("/api/admin/stats", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const totalSubs = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'validated' AND expires_at > datetime('now')").get() as any;
  const totalPot = totalSubs.count * 1000;
  const winnersPot = totalPot * 0.6;
  const adminPot = totalPot * 0.4;
  
  const rankings = db.prepare(`
    SELECT u.pseudo, u.phone, s.score, s.total_time, u.district
    FROM scores s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.score DESC, s.total_time ASC
    LIMIT 20
  `).all();

  const districtRankings = db.prepare(`
    SELECT u.district, SUM(s.score) as total_score, COUNT(DISTINCT u.id) as player_count
    FROM scores s
    JOIN users u ON s.user_id = u.id
    GROUP BY u.district
    ORDER BY total_score DESC
  `).all();

  res.json({ totalPot, winnersPot, adminPot, rankings, districtRankings });
});

app.get("/api/rankings/districts", authenticate, (req: any, res) => {
  const districtRankings = db.prepare(`
    SELECT u.district, SUM(s.score) as total_score, COUNT(DISTINCT u.id) as player_count
    FROM scores s
    JOIN users u ON s.user_id = u.id
    GROUP BY u.district
    ORDER BY total_score DESC
  `).all();
  res.json(districtRankings);
});

// --- Notification Routes ---

app.get("/api/notifications", authenticate, (req: any, res) => {
  const notifications = db.prepare("SELECT * FROM notifications WHERE is_sent = 1 ORDER BY created_at DESC LIMIT 20").all();
  res.json(notifications);
});

app.post("/api/admin/notifications/schedule", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const { title, message, scheduledAt } = req.body;
  db.prepare("INSERT INTO notifications (title, message, scheduled_at) VALUES (?, ?, ?)").run(title, message, scheduledAt);
  res.json({ success: true });
});

app.get("/api/admin/notifications/pending", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const pending = db.prepare("SELECT * FROM notifications WHERE is_sent = 0 ORDER BY scheduled_at ASC").all();
  res.json(pending);
});

// --- Arena Status ---

app.get("/api/arena/status", (req, res) => {
  const status = db.prepare("SELECT value FROM settings WHERE key = 'arena_open'").get() as any;
  res.json({ isOpen: status.value === '1' });
});

app.post("/api/admin/arena/toggle", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const { isOpen } = req.body;
  db.prepare("UPDATE settings SET value = ? WHERE key = 'arena_open'").run(isOpen ? '1' : '0');
  
  // Broadcast to all clients
  io.emit("arena_status_change", { isOpen });
  
  res.json({ success: true, isOpen });
});

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("join_ranking", () => {
    socket.join("ranking");
  });

  socket.on("submit_score", () => {
    // Broadcast to update live ranking
    const rankings = db.prepare(`
      SELECT u.pseudo, s.score, s.total_time, u.district
      FROM scores s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.score DESC, s.total_time ASC
      LIMIT 10
    `).all();
    io.to("ranking").emit("ranking_update", rankings);
  });
});

// Background task to check for scheduled notifications
setInterval(() => {
  const now = new Date().toISOString();
  const pending = db.prepare("SELECT * FROM notifications WHERE is_sent = 0 AND scheduled_at <= ?").all() as any[];
  
  pending.forEach(notif => {
    io.emit("notification", {
      title: notif.title,
      message: notif.message,
      id: notif.id
    });
    db.prepare("UPDATE notifications SET is_sent = 1 WHERE id = ?").run(notif.id);
  });
}, 30000); // Check every 30 seconds

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
