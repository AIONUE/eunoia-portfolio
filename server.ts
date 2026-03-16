import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render.com uses process.env.PORT
const PORT = parseInt(process.env.PORT || "3000", 10);

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
} else {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is missing. Database features will not work.");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Configure multer for file uploads
  const uploadsDir = path.join(process.cwd(), "uploads");
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

  // API Routes
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.use("/uploads", express.static(uploadsDir));

  // Work Routes
  app.get("/api/work", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data, error } = await supabase
      .from("work")
      .select("*")
      .order("displayOrder", { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.get("/api/work/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data: work, error: workError } = await supabase
      .from("work")
      .select("*")
      .eq("id", req.params.id)
      .single();
    
    if (workError) return res.status(500).json({ error: workError.message });
    
    const { data: images, error: imagesError } = await supabase
      .from("work_images")
      .select("*")
      .eq("workId", req.params.id)
      .order("displayOrder", { ascending: true });
    
    if (imagesError) return res.status(500).json({ error: imagesError.message });
    
    res.json({ ...work, images: images || [] });
  });

  app.post("/api/work", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { title, category, imageUrl, displayOrder } = req.body;
    const { data, error } = await supabase
      .from("work")
      .insert([{ title, category, imageUrl, displayOrder }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/work/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { title, category, imageUrl, content, displayOrder } = req.body;
    const { error } = await supabase
      .from("work")
      .update({ title, category, imageUrl, content, displayOrder })
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/work/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("work")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/work/:id/images", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { imageUrl, displayOrder } = req.body;
    const { data, error } = await supabase
      .from("work_images")
      .insert([{ workId: req.params.id, imageUrl, displayOrder }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/work/images/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("work_images")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // About Routes
  app.get("/api/about", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data, error } = await supabase
      .from("about")
      .select("*")
      .eq("id", 1)
      .single();
    
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
    res.json(data || {});
  });

  app.post("/api/about", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { slogan, description, skills, email, phone, instagram, imageUrl } = req.body;
    const { error } = await supabase
      .from("about")
      .upsert({ id: 1, slogan, description, skills, email, phone, instagram, imageUrl });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Blog Routes
  app.get("/api/blog", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data, error } = await supabase
      .from("blog")
      .select("*")
      .order("id", { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/blog", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { title, content, imageUrl, date } = req.body;
    const { data, error } = await supabase
      .from("blog")
      .insert([{ title, content, imageUrl, date: date || new Date().toLocaleDateString() }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/blog/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("blog")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Graduation Routes
  app.get("/api/graduation", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data, error } = await supabase
      .from("graduation_project")
      .select("*")
      .order("week", { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/graduation", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { week, title, content, imageUrl, date } = req.body;
    const { data, error } = await supabase
      .from("graduation_project")
      .insert([{ week, title, content, imageUrl, date: date || new Date().toLocaleDateString() }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/graduation/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("graduation_project")
      .delete()
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Vite middleware for development
  const rootDir = process.cwd();
  const distPath = path.join(rootDir, "dist");

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false
        },
        appType: "custom",
        root: rootDir,
      });
      
      app.use(vite.middlewares);

      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith("/api/")) return next();
        if (url.includes('.') && !url.endsWith('.html')) return next();

        try {
          const indexPath = path.resolve(rootDir, "index.html");
          if (!fs.existsSync(indexPath)) return res.status(404).send("index.html not found");
          
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (e) {
      console.error("Failed to start Vite server:", e);
    }
  } else {
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      if (req.url.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
