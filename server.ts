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

  app.post("/api/upload-multiple", upload.array("files", 10), (req, res) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const urls = (req.files as Express.Multer.File[]).map(file => `/uploads/${file.filename}`);
    res.json({ urls });
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
    try {
      const { data: work, error: workError } = await supabase
        .from("work")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (workError) {
        console.error(`Error fetching work ${req.params.id}:`, workError);
        return res.status(500).json({ error: workError.message });
      }

      if (!work) {
        return res.status(404).json({ error: "Work not found" });
      }
      
      const { data: images, error: imagesError } = await supabase
        .from("work_images")
        .select("*")
        .eq("workId", req.params.id)
        .order("displayOrder", { ascending: true });
      
      if (imagesError) {
        console.error(`Error fetching work images for ${req.params.id}:`, imagesError);
      }
      
      res.json({ ...work, images: images || [] });
    } catch (err) {
      console.error(`Unexpected error in GET /api/work/${req.params.id}:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/work", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { title, category, imageUrl, displayOrder } = req.body;
      const insertData: any = { title, category, displayOrder };
      if (imageUrl) insertData.imageUrl = imageUrl;

      const { data, error } = await supabase
        .from("work")
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('column "imageUrl" of relation "work" does not exist')) {
          console.log("imageUrl column missing in work table, retrying without it...");
          delete insertData.imageUrl;
          const { data: retryData, error: retryError } = await supabase
            .from("work")
            .insert([insertData])
            .select()
            .single();
          
          if (retryError) {
            console.error("Supabase error adding work (retry):", retryError);
            return res.status(500).json({ error: retryError.message });
          }
          return res.json(retryData || {});
        }
        console.error("Supabase error adding work:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (err) {
      console.error("Unexpected error in POST /api/work:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/work/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { title, category, imageUrl, content, displayOrder } = req.body;
      const updateData: any = { title, category, content, displayOrder };
      if (imageUrl) updateData.imageUrl = imageUrl;

      const { error } = await supabase
        .from("work")
        .update(updateData)
        .eq("id", req.params.id);
      
      if (error) {
        if (error.message.includes('column "imageUrl" of relation "work" does not exist')) {
          console.log("imageUrl column missing in work table, retrying without it...");
          delete updateData.imageUrl;
          const { error: retryError } = await supabase
            .from("work")
            .update(updateData)
            .eq("id", req.params.id);
          
          if (retryError) {
            console.error("Supabase error updating work (retry):", retryError);
            return res.status(500).json({ error: retryError.message });
          }
          return res.json({ success: true });
        }
        console.error("Supabase error updating work:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Unexpected error in POST /api/work/:id:", err);
      res.status(500).json({ error: "Internal server error" });
    }
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
    res.json(data || {});
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
    try {
      const { data, error } = await supabase
        .from("about")
        .select("*")
        .eq("id", 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching about data:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (err) {
      console.error("Unexpected error in GET /api/about:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/about", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { slogan, description, skills, email, phone, instagram, imageUrl } = req.body;
      const upsertData: any = { id: 1, slogan, description, skills, email, phone, instagram };
      if (imageUrl) upsertData.imageUrl = imageUrl;

      const { error } = await supabase
        .from("about")
        .upsert(upsertData);
      
      if (error) {
        if (error.message.includes('column "imageUrl" of relation "about" does not exist')) {
          console.log("imageUrl column missing in about table, retrying without it...");
          delete upsertData.imageUrl;
          const { error: retryError } = await supabase
            .from("about")
            .upsert(upsertData);
          
          if (retryError) {
            console.error("Supabase error upserting about (retry):", retryError);
            return res.status(500).json({ error: retryError.message });
          }
          return res.json({ success: true });
        }
        console.error("Error upserting about data:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Unexpected error in POST /api/about:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Blog Routes
  app.get("/api/blog", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { data, error } = await supabase
      .from("blog")
      .select("*")
      .order("id", { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/blog", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { title, content, imageUrl, images, date } = req.body;
      
      // Use ISO date format (YYYY-MM-DD) for better database compatibility
      const blogDate = date || new Date().toISOString().split('T')[0];
      
      // Prepare data for insertion
      // If imageUrl is provided but images is not, or if we want to ensure imageUrl is in images
      let finalImages = Array.isArray(images) ? [...images] : [];
      if (imageUrl && !finalImages.includes(imageUrl)) {
        finalImages.unshift(imageUrl);
      }

      const insertData: any = { 
        title, 
        content, 
        date: blogDate,
        images: finalImages
      };

      // Only include imageUrl if it's explicitly needed or if we're not sure about the schema
      // To be safe based on user request "모두 images 배열을 참조하도록", 
      // we might want to omit imageUrl if the column is gone.
      // However, if we don't know, we can try to include it or handle the error.
      // Let's try to include it but handle the error gracefully if the column doesn't exist.
      if (imageUrl) insertData.imageUrl = imageUrl;

      const { data, error } = await supabase
        .from("blog")
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        // If error is about missing column 'imageUrl', try again without it
        if (error.message.includes('column "imageUrl" of relation "blog" does not exist')) {
          console.log("imageUrl column missing in blog table, retrying without it...");
          delete insertData.imageUrl;
          const { data: retryData, error: retryError } = await supabase
            .from("blog")
            .insert([insertData])
            .select()
            .single();
          
          if (retryError) {
            console.error("Supabase error adding blog (retry):", retryError);
            return res.status(500).json({ error: retryError.message });
          }
          return res.json(retryData || {});
        }
        
        console.error("Supabase error adding blog:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (err) {
      console.error("Unexpected error in POST /api/blog:", err);
      res.status(500).json({ error: "Internal server error" });
    }
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

  app.get("/api/blog/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { data: post, error: postError } = await supabase
        .from("blog")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (postError) {
        console.error(`Error fetching blog ${req.params.id}:`, postError);
        return res.status(500).json({ error: postError.message });
      }
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      const { data: additionalImages, error: imagesError } = await supabase
        .from("blog_images")
        .select("*")
        .eq("blogId", req.params.id)
        .order("displayOrder", { ascending: true });
      
      if (imagesError) {
        console.error(`Error fetching blog images for ${req.params.id}:`, imagesError);
        // We can still return the post even if images fetch fails
      }
      
      // Merge images from column and table
      // Ensure post.images is an array
      const columnImages = Array.isArray(post.images) ? post.images : [];
      const images = [
        ...columnImages,
        ...(additionalImages || [])
      ];
      
      res.json({ ...post, images });
    } catch (err) {
      console.error(`Unexpected error in GET /api/blog/${req.params.id}:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/blog/:id/images", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { imageUrl, displayOrder } = req.body;
    const { data, error } = await supabase
      .from("blog_images")
      .insert([{ blogId: req.params.id, imageUrl, displayOrder }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || {});
  });

  app.delete("/api/blog/images/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("blog_images")
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
    res.json(data || []);
  });

  app.post("/api/graduation", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { week, title, content, imageUrl, images, date } = req.body;
      
      // Use ISO date format (YYYY-MM-DD) for better database compatibility
      const projectDate = date || new Date().toISOString().split('T')[0];
      
      let finalImages = Array.isArray(images) ? [...images] : [];
      if (imageUrl && !finalImages.includes(imageUrl)) {
        finalImages.unshift(imageUrl);
      }

      const insertData: any = { 
        week, 
        title, 
        content, 
        date: projectDate,
        images: finalImages
      };
      
      if (imageUrl) insertData.imageUrl = imageUrl;

      const { data, error } = await supabase
        .from("graduation_project")
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        // If error is about missing column 'imageUrl', try again without it
        if (error.message.includes('column "imageUrl" of relation "graduation_project" does not exist')) {
          console.log("imageUrl column missing in graduation_project table, retrying without it...");
          delete insertData.imageUrl;
          const { data: retryData, error: retryError } = await supabase
            .from("graduation_project")
            .insert([insertData])
            .select()
            .single();
          
          if (retryError) {
            console.error("Supabase error adding graduation project (retry):", retryError);
            return res.status(500).json({ error: retryError.message });
          }
          return res.json(retryData || {});
        }

        console.error("Supabase error adding graduation project:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data || {});
    } catch (err) {
      console.error("Unexpected error in POST /api/graduation:", err);
      res.status(500).json({ error: "Internal server error" });
    }
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

  app.get("/api/graduation/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    try {
      const { data: post, error: postError } = await supabase
        .from("graduation_project")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (postError) {
        console.error(`Error fetching graduation ${req.params.id}:`, postError);
        return res.status(500).json({ error: postError.message });
      }

      if (!post) {
        return res.status(404).json({ error: "Graduation post not found" });
      }
      
      const { data: additionalImages, error: imagesError } = await supabase
        .from("graduation_images")
        .select("*")
        .eq("graduationId", req.params.id)
        .order("displayOrder", { ascending: true });
      
      if (imagesError) {
        console.error(`Error fetching graduation images for ${req.params.id}:`, JSON.stringify(imagesError, null, 2));
      }
      
      // Merge images from column and table
      const columnImages = Array.isArray(post.images) ? post.images : [];
      const images = [
        ...columnImages,
        ...(additionalImages || [])
      ];
      
      res.json({ ...post, images });
    } catch (err) {
      console.error(`Unexpected error in GET /api/graduation/${req.params.id}:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/graduation/:id/images", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { imageUrl, displayOrder } = req.body;
    const { data, error } = await supabase
      .from("graduation_images")
      .insert([{ graduationId: req.params.id, imageUrl, displayOrder }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || {});
  });

  app.delete("/api/graduation/images/:id", async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Database not configured" });
    const { error } = await supabase
      .from("graduation_images")
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
