import express from "express";
// import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File logging for diagnosis
const logFile = path.join(process.cwd(), "server.log");
const log = (msg: string) => {
  const entry = `${new Date().toISOString()} - ${msg}\n`;
  fs.appendFileSync(logFile, entry);
  console.log(msg);
};

log("Starting server script execution...");

// Mock DB for testing
let db: any = {
  prepare: () => ({ 
    get: () => ({ count: 1 }), 
    run: () => ({ lastInsertRowid: 1 }), 
    all: () => [] 
  }),
  exec: () => {}
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logging for diagnosis
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api/')) {
      log(`${req.method} ${req.url}`);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === "production"
    });
  });

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
  const rootDir = process.cwd();
  const distPath = path.join(rootDir, "dist");
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`Server configuration:`);
  console.log(`- rootDir: ${rootDir}`);
  console.log(`- distPath: ${distPath}`);
  console.log(`- isProduction: ${isProduction}`);
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- distExists: ${fs.existsSync(distPath)}`);

  if (!isProduction) {
    console.log("Starting in development mode with Vite...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false
        },
        appType: "custom", // Changed to custom to handle HTML manually
        root: rootDir,
      });
      
      // Use vite's connect instance as middleware
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");

      // Handle index.html with Vite transformation
      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        
        // Skip API routes
        if (url.startsWith("/api/")) return next();
        
        // Skip file requests that should have been handled by vite.middlewares
        // (e.g. .tsx, .ts, .css, .svg etc)
        if (url.includes('.') && !url.endsWith('.html')) {
          return next();
        }

        try {
          const indexPath = path.resolve(rootDir, "index.html");
          if (!fs.existsSync(indexPath)) {
            console.error(`index.html not found at ${indexPath}`);
            return res.status(404).send("index.html not found");
          }
          
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          console.error("Vite transform error:", e);
          next(e);
        }
      });
    } catch (e) {
      console.error("Failed to start Vite server:", e);
    }
  } else {
    console.log(`Starting in production mode. Serving static files from: ${distPath}`);
    if (fs.existsSync(distPath)) {
      console.log("Dist directory contents:", fs.readdirSync(distPath));
      if (fs.existsSync(path.join(distPath, "assets"))) {
        console.log("Assets directory contents:", fs.readdirSync(path.join(distPath, "assets")));
      }
    } else {
      console.error("Dist directory does not exist!");
    }

    // Explicitly serve assets with correct MIME types
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript");
        } else if (filePath.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css");
        }
      }
    }));

    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      // If it's an API request that reached here, it's a 404
      if (req.url.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }

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
    log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
