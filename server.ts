import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "portfolio.db");
console.log(`Using database at: ${dbPath}`);
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS work (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    imageUrl TEXT NOT NULL,
    content TEXT,
    displayOrder INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS work_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workId INTEGER NOT NULL,
    imageUrl TEXT NOT NULL,
    displayOrder INTEGER DEFAULT 0,
    FOREIGN KEY (workId) REFERENCES work(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    slogan TEXT,
    description TEXT,
    skills TEXT,
    email TEXT,
    phone TEXT,
    instagram TEXT,
    imageUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS blog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    imageUrl TEXT,
    date TEXT NOT NULL,
    displayOrder INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS graduation_project (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    imageUrl TEXT,
    date TEXT NOT NULL
  );
`);

// Seed initial data if empty
const workCount = db.prepare("SELECT COUNT(*) as count FROM work").get() as { count: number };
console.log(`Current work count: ${workCount.count}`);
if (workCount.count === 0) {
  console.log("Seeding work data...");
  const insertWork = db.prepare("INSERT INTO work (title, category, imageUrl, displayOrder) VALUES (?, ?, ?, ?)");
  insertWork.run("Shinhan Investment Corp Project", "Brand Identity", "https://picsum.photos/seed/shinhan/800/1000", 1);
  insertWork.run("AmorePacific Industry-Academic", "UI/UX Design", "https://picsum.photos/seed/amore/800/1000", 2);
  insertWork.run("IT Club Award Winning", "Product Design", "https://picsum.photos/seed/award/800/1000", 3);
  insertWork.run("Visual Identity System", "Graphic Design", "https://picsum.photos/seed/visual/800/1000", 4);
  insertWork.run("Mobile App Concept", "App Design", "https://picsum.photos/seed/app/800/1000", 5);
  insertWork.run("Editorial Design Collection", "Print", "https://picsum.photos/seed/print/800/1000", 6);
  insertWork.run("Brand Packaging Design", "Packaging", "https://picsum.photos/seed/pack/800/1000", 7);
  insertWork.run("Web Interface Design", "Web Design", "https://picsum.photos/seed/web/800/1000", 8);
  insertWork.run("Typography Poster Series", "Poster", "https://picsum.photos/seed/poster/800/1000", 9);
}

const aboutCount = db.prepare("SELECT COUNT(*) as count FROM about").get() as { count: number };
console.log(`Current about count: ${aboutCount.count}`);
if (aboutCount.count === 0) {
  console.log("Seeding about data...");
  db.prepare(`
    INSERT INTO about (id, slogan, description, skills, email, phone, instagram, imageUrl)
    VALUES (1, 'Communication through empathy', 
    '숙명여자대학교 시각영상디자인과 재학 중. 다양한 기업과의 산학 프로젝트를 통해 실무 감각을 익히고 있습니다.', 
    'Figma, Adobe Creative Suite, Midjourney, Runway', 
    'wldms2418@sookmyung.ac.kr', '010-4038-1134', '@2.eunoia', 'https://picsum.photos/seed/jieun/800/1000')
  `).run();
}

const blogCount = db.prepare("SELECT COUNT(*) as count FROM blog").get() as { count: number };
if (blogCount.count === 0) {
  const insertBlog = db.prepare("INSERT INTO blog (title, content, imageUrl, date) VALUES (?, ?, ?, ?)");
  insertBlog.run("First Blog Post", "Welcome to my new portfolio blog. I will be sharing my design journey here.", "https://picsum.photos/seed/blog1/1200/800", new Date().toLocaleDateString());
}

const gradCount = db.prepare("SELECT COUNT(*) as count FROM graduation_project").get() as { count: number };
if (gradCount.count === 0) {
  const insertGrad = db.prepare("INSERT INTO graduation_project (week, title, content, imageUrl, date) VALUES (?, ?, ?, ?, ?)");
  insertGrad.run(1, "Week 1: Project Kickoff", "Started the graduation project with initial research and brainstorming.", "https://picsum.photos/seed/grad1/1200/800", new Date().toLocaleDateString());
  insertGrad.run(2, "Week 2: Concept Development", "Developed three core concepts for the project and received feedback.", "https://picsum.photos/seed/grad2/1200/800", new Date().toLocaleDateString());
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Configure multer for file uploads
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({ storage });

  // Serve uploads statically
  app.use("/uploads", express.static(uploadsDir));

  // API Routes
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/work", (req, res) => {
    const works = db.prepare("SELECT * FROM work ORDER BY displayOrder ASC").all();
    res.json(works);
  });

  app.get("/api/work/:id", (req, res) => {
    const work = db.prepare("SELECT * FROM work WHERE id = ?").get(req.params.id);
    if (!work) return res.status(404).json({ error: "Work not found" });
    const images = db.prepare("SELECT * FROM work_images WHERE workId = ? ORDER BY displayOrder ASC").all(req.params.id);
    res.json({ ...work, images });
  });

  app.post("/api/work/:id", (req, res) => {
    const { title, category, imageUrl, content, displayOrder } = req.body;
    db.prepare(`
      UPDATE work SET title = ?, category = ?, imageUrl = ?, content = ?, displayOrder = ?
      WHERE id = ?
    `).run(title, category, imageUrl, content, displayOrder, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/work/:id/images", (req, res) => {
    const { imageUrl, displayOrder } = req.body;
    const info = db.prepare("INSERT INTO work_images (workId, imageUrl, displayOrder) VALUES (?, ?, ?)").run(req.params.id, imageUrl, displayOrder || 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/work/images/:id", (req, res) => {
    db.prepare("DELETE FROM work_images WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/work", (req, res) => {
    const { title, category, imageUrl, displayOrder } = req.body;
    const info = db.prepare("INSERT INTO work (title, category, imageUrl, displayOrder) VALUES (?, ?, ?, ?)").run(title, category, imageUrl, displayOrder);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/work/:id", (req, res) => {
    db.prepare("DELETE FROM work WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/about", (req, res) => {
    const about = db.prepare("SELECT * FROM about WHERE id = 1").get();
    res.json(about);
  });

  app.post("/api/about", (req, res) => {
    const { slogan, description, skills, email, phone, instagram, imageUrl } = req.body;
    db.prepare(`
      UPDATE about SET slogan = ?, description = ?, skills = ?, email = ?, phone = ?, instagram = ?, imageUrl = ?
      WHERE id = 1
    `).run(slogan, description, skills, email, phone, instagram, imageUrl);
    res.json({ success: true });
  });

  app.get("/api/blog", (req, res) => {
    const posts = db.prepare("SELECT * FROM blog ORDER BY id DESC").all();
    res.json(posts);
  });

  app.post("/api/blog", (req, res) => {
    const { title, content, imageUrl, date } = req.body;
    const info = db.prepare("INSERT INTO blog (title, content, imageUrl, date) VALUES (?, ?, ?, ?)").run(title, content, imageUrl, date || new Date().toLocaleDateString());
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/blog/:id", (req, res) => {
    db.prepare("DELETE FROM blog WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/graduation", (req, res) => {
    const posts = db.prepare("SELECT * FROM graduation_project ORDER BY week DESC").all();
    res.json(posts);
  });

  app.post("/api/graduation", (req, res) => {
    const { week, title, content, imageUrl, date } = req.body;
    const info = db.prepare("INSERT INTO graduation_project (week, title, content, imageUrl, date) VALUES (?, ?, ?, ?, ?)").run(week, title, content, imageUrl, date || new Date().toLocaleDateString());
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/graduation/:id", (req, res) => {
    db.prepare("DELETE FROM graduation_project WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`Index file not found at: ${indexPath}`);
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
