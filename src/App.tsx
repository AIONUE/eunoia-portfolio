import React, { useState, useEffect, useRef } from 'react';
console.log('App.tsx: Module loaded');
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { 
  Menu, X, Instagram, Mail, Phone, Plus, Trash2, Settings, LogOut, 
  Upload, Loader2, ArrowRight, ExternalLink, ChevronRight
} from 'lucide-react';

// --- Custom Cursor Component ---
const CustomCursor = ({ hoverText }: { hoverText?: string }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  return (
    <>
      <motion.div
        className="custom-cursor hidden md:block"
        animate={{ x: position.x - 4, y: position.y - 4 }}
        transition={{ type: 'spring', damping: 30, stiffness: 250, mass: 0.5 }}
      />
      <motion.div
        className="custom-cursor-ring hidden md:block flex items-center justify-center overflow-hidden"
        animate={{ 
          x: position.x - 20, 
          y: position.y - 20,
          scale: hoverText ? 2.5 : 1,
          backgroundColor: hoverText ? 'rgba(99, 153, 239, 0.9)' : 'transparent',
          borderColor: hoverText ? 'transparent' : 'rgba(26, 26, 26, 0.5)'
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 150, mass: 0.8 }}
      />
    </>
  );
};

// --- Types ---
interface Work {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  content?: string;
  displayOrder: number;
  images?: WorkImage[];
}

interface WorkImage {
  id: number;
  workId: number;
  imageUrl: string;
  displayOrder: number;
}

interface About {
  slogan: string;
  description: string;
  skills: string;
  email: string;
  phone: string;
  instagram: string;
  imageUrl?: string;
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  date: string;
  images?: BlogImage[];
}

interface BlogImage {
  id: number;
  blogId: number;
  imageUrl: string;
  displayOrder: number;
}

interface GraduationPost {
  id: number;
  week: number;
  title: string;
  content: string;
  imageUrl?: string;
  date: string;
  images?: GraduationImage[];
}

interface GraduationImage {
  id: number;
  graduationId: number;
  imageUrl: string;
  displayOrder: number;
}

type View = 'ABOUT' | 'WORK' | 'BLOG' | 'CONTACT' | 'ADMIN' | 'GRADUATION_PROJECT';

function FileUpload({ onUpload, onUploads, label, multiple = false }: { onUpload?: (url: string) => void, onUploads?: (urls: string[]) => void, label: string, multiple?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    
    if (multiple) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    } else {
      formData.append('file', files[0]);
    }

    try {
      const endpoint = multiple ? '/api/upload-multiple' : '/api/upload';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (multiple && data.urls && onUploads) {
        onUploads(data.urls);
      } else if (data.url && onUpload) {
        onUpload(data.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase opacity-80 font-bold block">{label}</label>
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${label}`}
          accept="image/*"
          multiple={multiple}
        />
        <label
          htmlFor={`file-upload-${label}`}
          className="flex items-center gap-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:border-brand-green transition-colors text-xs opacity-80 font-bold"
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {isUploading ? 'Uploading...' : 'Choose Image'}
        </label>
      </div>
    </div>
  );
}

// --- Reveal Text Component ---
const RevealText = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// --- Parallax Text Component ---
const ParallaxSection = ({ children, speed = 0.1, className = "" }: { children: React.ReactNode, speed?: number, className?: string }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

export default function App() {
  console.log('App: Rendering component...');
  const [view, setView] = useState<View>('WORK');
  const [works, setWorks] = useState<Work[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [graduationPosts, setGraduationPosts] = useState<GraduationPost[]>([]);
  const [about, setAbout] = useState<About | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedProject, setSelectedProject] = useState<Work | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [selectedGraduationPost, setSelectedGraduationPost] = useState<GraduationPost | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<number | null>(null);
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null);
  const [editingGraduationId, setEditingGraduationId] = useState<number | null>(null);
  const [cursorText, setCursorText] = useState<string | undefined>(undefined);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  // Admin form states
  const [newWork, setNewWork] = useState({ title: '', category: '', imageUrl: '', displayOrder: 0 });
  const [newBlog, setNewBlog] = useState({ title: '', content: '', imageUrl: '', images: [] as string[] });
  const [newGraduation, setNewGraduation] = useState({ week: 1, title: '', content: '', imageUrl: '', images: [] as string[] });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchWorks(), fetchAbout(), fetchBlogs(), fetchGraduationPosts()]);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to load data. Please check your connection and Supabase configuration.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const fetchWorks = async () => {
    try {
      const res = await fetch('/api/work');
      const data = await res.json();
      console.log('Fetched works:', data);
      setWorks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching works:', err);
      setWorks([]);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/blog');
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setBlogs([]);
    }
  };

  const fetchGraduationPosts = async () => {
    try {
      const res = await fetch('/api/graduation');
      const data = await res.json();
      setGraduationPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching graduation posts:', err);
      setGraduationPosts([]);
    }
  };

  const fetchAbout = async () => {
    try {
      const res = await fetch('/api/about');
      const data = await res.json();
      console.log('Fetched about:', data);
      setAbout(data && typeof data === 'object' ? data : null);
    } catch (err) {
      console.error('Error fetching about:', err);
      setAbout(null);
    }
  };

  const WorkDetailEditor = ({ workId, onBack }: { workId: number, onBack: () => void }) => {
    const [work, setWork] = useState<Work | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/work/${workId}`);
          const data = await response.json();
          setWork(data);
        } catch (error) {
          console.error('Failed to fetch work details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [workId]);

    const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!work) return;
      try {
        await fetch(`/api/work/${workId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(work),
        });
        alert('Work updated successfully');
        fetchWorks();
      } catch (error) {
        console.error('Failed to update work:', error);
      }
    };

    const handleAddImage = async (url: string) => {
      if (!work) return;
      try {
        const response = await fetch(`/api/work/${workId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url, displayOrder: (work.images?.length || 0) + 1 }),
        });
        const data = await response.json();
        const newImage = { id: data.id, workId, imageUrl: url, displayOrder: (work.images?.length || 0) + 1 };
        setWork({ ...work, images: [...(work.images || []), newImage] });
      } catch (error) {
        console.error('Failed to add image:', error);
      }
    };

    const handleDeleteImage = async (imageId: number) => {
      if (!work) return;
      try {
        await fetch(`/api/work/images/${imageId}`, { method: 'DELETE' });
        setWork({ ...work, images: work.images?.filter(img => img.id !== imageId) });
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    };

    if (isLoading || !work) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
      <div className="space-y-12">
        <button onClick={onBack} className="text-xs uppercase tracking-widest opacity-60 flex items-center gap-2 hover:opacity-100 transition-opacity">
          <ArrowRight className="rotate-180" size={14} /> Back to List
        </button>
        
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Edit Project Details: {work.title}</h3>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] uppercase opacity-80 font-bold">Title</label>
                <input
                  value={work.title}
                  onChange={(e) => setWork({ ...work, title: e.target.value })}
                  className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase opacity-80 font-bold">Category</label>
                <input
                  value={work.category}
                  onChange={(e) => setWork({ ...work, category: e.target.value })}
                  className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>
            <div>
              <FileUpload label="Change Main Image" onUpload={(url) => setWork({ ...work, imageUrl: url })} />
              {work.imageUrl && (
                <div className="mt-2 w-20 h-20 border border-gray-100 overflow-hidden">
                  <img src={work.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase opacity-80 font-bold">Overview Content</label>
              <textarea
                value={work.content || ''}
                onChange={(e) => setWork({ ...work, content: e.target.value })}
                className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-40"
                placeholder="Describe the project..."
              />
            </div>
            <button type="submit" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold">
              Save Basic Info
            </button>
          </form>
        </section>

        <section className="pt-12 border-t border-gray-100">
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Project Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {work.images?.map((img) => (
              <div key={img.id} className="relative group aspect-video bg-gray-50 border border-gray-100 overflow-hidden">
                <img src={img.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="max-w-sm">
            <FileUpload label="Add Detail Image" onUpload={handleAddImage} />
          </div>
        </section>
      </div>
    );
  };

  const BlogDetailEditor = ({ blogId, onBack }: { blogId: number, onBack: () => void }) => {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/blog/${blogId}`);
          const data = await response.json();
          setPost(data);
        } catch (error) {
          console.error('Failed to fetch blog details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [blogId]);

    const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!post) return;
      try {
        await fetch(`/api/blog/${blogId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        });
        alert('Blog post updated successfully');
        fetchBlogs();
      } catch (error) {
        console.error('Failed to update blog:', error);
      }
    };

    const handleAddImages = async (urls: string[]) => {
      if (!post) return;
      try {
        const newImages = [];
        for (const url of urls) {
          const response = await fetch(`/api/blog/${blogId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url, displayOrder: (post.images?.length || 0) + newImages.length + 1 }),
          });
          const data = await response.json();
          newImages.push({ id: data.id, blogId, imageUrl: url, displayOrder: (post.images?.length || 0) + newImages.length + 1 });
        }
        setPost({ ...post, images: [...(post.images || []), ...newImages] });
      } catch (error) {
        console.error('Failed to add images:', error);
      }
    };

    const handleDeleteImage = async (imageId: number) => {
      if (!post) return;
      try {
        await fetch(`/api/blog/images/${imageId}`, { method: 'DELETE' });
        setPost({ ...post, images: post.images?.filter(img => img.id !== imageId) });
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    };

    if (isLoading || !post) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
      <div className="space-y-12">
        <button onClick={onBack} className="text-xs uppercase tracking-widest opacity-60 flex items-center gap-2 hover:opacity-100 transition-opacity">
          <ArrowRight className="rotate-180" size={14} /> Back to List
        </button>
        
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Edit Blog Post: {post.title}</h3>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="text-[10px] uppercase opacity-80 font-bold">Title</label>
              <input
                value={post.title}
                onChange={(e) => setPost({ ...post, title: e.target.value })}
                className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
              />
            </div>
            <div>
              <FileUpload label="Change Main Image" onUpload={(url) => setPost({ ...post, imageUrl: url })} />
              {post.imageUrl && (
                <div className="mt-2 w-20 h-20 border border-gray-100 overflow-hidden">
                  <img src={post.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase opacity-80 font-bold">Content</label>
              <textarea
                value={post.content || ''}
                onChange={(e) => setPost({ ...post, content: e.target.value })}
                className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-40"
              />
            </div>
            <button type="submit" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold">
              Save Post
            </button>
          </form>
        </section>

        <section className="pt-12 border-t border-gray-100">
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Additional Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {post.images?.map((img: any, idx: number) => (
              <div key={img.id || idx} className="relative group aspect-video bg-gray-50 border border-gray-100 overflow-hidden">
                <img src={typeof img === 'string' ? img : img.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                {img.id && (
                  <button 
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="max-w-sm">
            <FileUpload label="Add Detail Images (Multiple)" multiple={true} onUploads={handleAddImages} />
          </div>
        </section>
      </div>
    );
  };

  const GraduationDetailEditor = ({ graduationId, onBack }: { graduationId: number, onBack: () => void }) => {
    const [post, setPost] = useState<GraduationPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/graduation/${graduationId}`);
          const data = await response.json();
          setPost(data);
        } catch (error) {
          console.error('Failed to fetch graduation details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [graduationId]);

    const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!post) return;
      try {
        await fetch(`/api/graduation/${graduationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        });
        alert('Graduation post updated successfully');
        fetchGraduationPosts();
      } catch (error) {
        console.error('Failed to update graduation:', error);
      }
    };

    const handleAddImages = async (urls: string[]) => {
      if (!post) return;
      try {
        const newImages = [];
        for (const url of urls) {
          const response = await fetch(`/api/graduation/${graduationId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url, displayOrder: (post.images?.length || 0) + newImages.length + 1 }),
          });
          const data = await response.json();
          newImages.push({ id: data.id, graduationId, imageUrl: url, displayOrder: (post.images?.length || 0) + newImages.length + 1 });
        }
        setPost({ ...post, images: [...(post.images || []), ...newImages] });
      } catch (error) {
        console.error('Failed to add images:', error);
      }
    };

    const handleDeleteImage = async (imageId: number) => {
      if (!post) return;
      try {
        await fetch(`/api/graduation/images/${imageId}`, { method: 'DELETE' });
        setPost({ ...post, images: post.images?.filter(img => img.id !== imageId) });
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    };

    if (isLoading || !post) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
      <div className="space-y-12">
        <button onClick={onBack} className="text-xs uppercase tracking-widest opacity-60 flex items-center gap-2 hover:opacity-100 transition-opacity">
          <ArrowRight className="rotate-180" size={14} /> Back to List
        </button>
        
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Edit Graduation Post: {post.title}</h3>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase opacity-80 font-bold">Week</label>
                <input
                  type="number"
                  value={post.week}
                  onChange={(e) => setPost({ ...post, week: parseInt(e.target.value) })}
                  className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase opacity-80 font-bold">Title</label>
                <input
                  value={post.title}
                  onChange={(e) => setPost({ ...post, title: e.target.value })}
                  className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>
            <div>
              <FileUpload label="Change Main Image" onUpload={(url) => setPost({ ...post, imageUrl: url })} />
              {post.imageUrl && (
                <div className="mt-2 w-20 h-20 border border-gray-100 overflow-hidden">
                  <img src={post.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase opacity-80 font-bold">Content</label>
              <textarea
                value={post.content || ''}
                onChange={(e) => setPost({ ...post, content: e.target.value })}
                className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-40"
              />
            </div>
            <button type="submit" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest font-bold">
              Save Post
            </button>
          </form>
        </section>

        <section className="pt-12 border-t border-gray-100">
          <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Additional Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {post.images?.map((img: any, idx: number) => (
              <div key={img.id || idx} className="relative group aspect-video bg-gray-50 border border-gray-100 overflow-hidden">
                <img src={typeof img === 'string' ? img : img.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                {img.id && (
                  <button 
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="max-w-sm">
            <FileUpload label="Add Detail Images (Multiple)" multiple={true} onUploads={handleAddImages} />
          </div>
        </section>
      </div>
    );
  };
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1111') {
      setIsAdmin(true);
      setLoginError('');
      setPassword('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWork.title || !newWork.category || !newWork.imageUrl) {
      alert('Please fill in all fields and upload an image');
      return;
    }
    try {
      const response = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWork),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add work');
      }
      setNewWork({ title: '', category: '', imageUrl: '', displayOrder: 0 });
      alert('Project added successfully!');
      fetchWorks();
    } catch (error: any) {
      console.error('Error adding work:', error);
      alert(`Failed to add project: ${error.message}`);
    }
  };

  const handleDeleteWork = async (id: number) => {
    if (confirm('Delete this project?')) {
      try {
        await fetch(`/api/work/${id}`, { method: 'DELETE' });
        fetchWorks();
      } catch (error) {
        console.error('Error deleting work:', error);
      }
    }
  };

  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlog.title || !newBlog.content) {
      alert('Please fill in title and content');
      return;
    }
    try {
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlog),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add blog post');
      }
      setNewBlog({ title: '', content: '', imageUrl: '', images: [] });
      alert('Blog post added successfully!');
      fetchBlogs();
    } catch (error: any) {
      console.error('Error adding blog:', error);
      alert(`Failed to add blog post: ${error.message}`);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    if (confirm('Delete this post?')) {
      try {
        await fetch(`/api/blog/${id}`, { method: 'DELETE' });
        fetchBlogs();
      } catch (error) {
        console.error('Error deleting blog:', error);
      }
    }
  };

  const handleAddGraduation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGraduation.title || !newGraduation.content) {
      alert('Please fill in title and content');
      return;
    }
    try {
      const response = await fetch('/api/graduation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGraduation),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add graduation post');
      }
      setNewGraduation({ week: 1, title: '', content: '', imageUrl: '', images: [] });
      alert('Graduation post added successfully!');
      fetchGraduationPosts();
    } catch (error: any) {
      console.error('Error adding graduation:', error);
      alert(`Failed to add graduation post: ${error.message}`);
    }
  };

  const handleDeleteGraduation = async (id: number) => {
    if (confirm('Delete this graduation post?')) {
      try {
        await fetch(`/api/graduation/${id}`, { method: 'DELETE' });
        fetchGraduationPosts();
      } catch (error) {
        console.error('Error deleting graduation:', error);
      }
    }
  };

  const handleUpdateAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!about) return;
    await fetch('/api/about', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(about),
    });
    alert('About info updated');
  };

  const NavItem = ({ label, target }: { label: string, target: View }) => (
    <button
      onClick={() => { setView(target); setIsMobileMenuOpen(false); window.scrollTo(0, 0); }}
      onMouseEnter={() => setCursorText('GO')}
      onMouseLeave={() => setCursorText(undefined)}
      className={`text-[11px] tracking-[0.3em] uppercase transition-all duration-500 hover:opacity-100 relative group font-bold nav-highlighter ${view === target ? 'active opacity-100' : 'opacity-60'}`}
    >
      {label}
    </button>
  );

  const Hero = () => (
    <section className="h-screen flex flex-col justify-center px-8 md:px-20 bg-paper relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="z-10"
      >
        <h2 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter mb-8">
          COMMUNICATION<br />
          THROUGH<br />
          <span className="text-brand-gradient">EMPATHY</span>
        </h2>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <p className="text-sm md:text-lg max-w-md opacity-70 font-normal leading-relaxed">
            Ji Eun Lee is a UI/UX designer focused on creating intuitive and visually compelling digital products that bridge the gap between users and technology.
          </p>
          <motion.button 
            whileHover={{ x: 10 }}
            onClick={() => {
              const el = document.getElementById('work-grid');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-4 text-xs uppercase tracking-widest group"
          >
            Explore Projects <ArrowRight size={16} className="group-hover:text-[#78C7FE] transition-colors" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );

  const ProjectModal = ({ project, onClose }: { project: Work, onClose: () => void }) => {
    const [fullProject, setFullProject] = useState<Work | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/work/${project.id}`);
          const data = await response.json();
          setFullProject(data);
        } catch (error) {
          console.error('Failed to fetch project details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [project.id]);

    if (isLoading) {
      return (
        <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-green" size={48} />
          <span className="ml-4 text-xl font-bold">Loading Project...</span>
        </div>
      );
    }

    const displayProject = fullProject || project;

    if (!displayProject) return null;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm p-4 md:p-0"
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full md:w-[60vw] h-full bg-white overflow-y-auto no-scrollbar"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="fixed top-8 right-8 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-brand-gradient transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="p-8 md:p-20 space-y-12">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#78C7FE] font-bold">{displayProject?.category}</p>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">{displayProject?.title}</h2>
            </div>
            
            {displayProject?.imageUrl && (
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img src={displayProject.imageUrl} className="w-full h-full object-cover" alt={displayProject.title} referrerPolicy="no-referrer" />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-gray-100">
              <div className="md:col-span-2 space-y-6">
                <h4 className="text-xs uppercase tracking-widest font-bold opacity-60">Overview</h4>
                <div className="text-lg leading-relaxed opacity-80 whitespace-pre-wrap break-keep">
                  {displayProject?.content || "No description available."}
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-bold opacity-60 mb-2">Category</h4>
                  <p className="text-sm">{displayProject?.category}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-12">
              {displayProject?.images?.map((img) => (
                <div key={img.id} className="w-full overflow-hidden bg-gray-50">
                  <img src={img.imageUrl} className="w-full h-auto object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const BlogModal = ({ blog, onClose }: { blog: BlogPost, onClose: () => void }) => {
    const [fullBlog, setFullBlog] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/blog/${blog.id}`);
          const data = await response.json();
          setFullBlog(data);
        } catch (error) {
          console.error('Failed to fetch blog details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [blog.id]);

    if (isLoading) {
      return (
        <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-green" size={48} />
          <span className="ml-4 text-xl font-bold">Loading Post...</span>
        </div>
      );
    }

    const displayBlog = fullBlog || blog;

    if (!displayBlog) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-paper overflow-y-auto px-8 md:px-20 py-20"
      >
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={onClose}
            className="fixed top-8 right-8 md:top-12 md:right-12 p-4 bg-black text-white rounded-full hover:scale-110 transition-transform z-[110]"
          >
            <X size={24} />
          </button>

          <header className="mb-16 space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-xs opacity-50 font-medium">{displayBlog?.date}</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
              {displayBlog?.title}
            </h2>
          </header>

          {displayBlog?.imageUrl && (
            <div className="aspect-video mb-16 overflow-hidden bg-gray-100">
              <img 
                src={displayBlog.imageUrl} 
                alt={displayBlog.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="prose prose-xl max-w-none mb-20">
            <p className="text-xl md:text-2xl leading-relaxed opacity-80 whitespace-pre-wrap break-keep">
              {displayBlog?.content}
            </p>
          </div>

          <div className="space-y-12 mb-20">
            {displayBlog?.images?.map((img: any, idx: number) => (
              <div key={img.id || idx} className="w-full overflow-hidden bg-gray-50">
                <img src={typeof img === 'string' ? img : img.imageUrl} className="w-full h-auto object-cover" alt="" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>

          <footer className="mt-32 pt-12 border-t border-black/5 flex justify-between items-center">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              <ArrowRight size={14} className="rotate-180" />
              <span>Back to List</span>
            </button>
          </footer>
        </div>
      </motion.div>
    );
  };

  const GraduationModal = ({ post, onClose }: { post: GraduationPost, onClose: () => void }) => {
    const [fullPost, setFullPost] = useState<GraduationPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/graduation/${post.id}`);
          const data = await response.json();
          setFullPost(data);
        } catch (error) {
          console.error('Failed to fetch graduation details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }, [post.id]);

    if (isLoading) {
      return (
        <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-green" size={48} />
          <span className="ml-4 text-xl font-bold">Loading Project...</span>
        </div>
      );
    }

    const displayPost = fullPost || post;

    if (!displayPost) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-paper overflow-y-auto px-8 md:px-20 py-20"
      >
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={onClose}
            className="fixed top-8 right-8 md:top-12 md:right-12 p-4 bg-black text-white rounded-full hover:scale-110 transition-transform z-[110]"
          >
            <X size={24} />
          </button>

          <header className="mb-16 space-y-6">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-[#78C7FE] text-black text-[10px] font-bold uppercase tracking-widest">Week {displayPost?.week}</span>
              <span className="text-xs opacity-50 font-medium">{displayPost?.date}</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
              {displayPost?.title}
            </h2>
          </header>

          {displayPost?.imageUrl && (
            <div className="aspect-video mb-16 overflow-hidden bg-gray-100">
              <img 
                src={displayPost.imageUrl} 
                alt={displayPost.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="prose prose-xl max-w-none mb-20">
            <p className="text-xl md:text-2xl leading-relaxed opacity-80 whitespace-pre-wrap break-keep">
              {displayPost?.content}
            </p>
          </div>

          <div className="space-y-12 mb-20">
            {displayPost?.images?.map((img: any, idx: number) => (
              <div key={img.id || idx} className="w-full overflow-hidden bg-gray-50">
                <img src={typeof img === 'string' ? img : img.imageUrl} className="w-full h-auto object-cover" alt="" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>

          <footer className="mt-32 pt-12 border-t border-black/5 flex justify-between items-center">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              <ArrowRight size={14} className="rotate-180" />
              <span>Back to List</span>
            </button>
          </footer>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-paper selection:bg-[#78C7FE] selection:text-black">
      <CustomCursor hoverText={cursorText} />
      
      {/* --- Sticky Reveal Header --- */}
      <motion.header 
        animate={{ y: showHeader ? 0 : -100 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-[60] flex justify-between items-center p-6 md:px-12 md:py-8 bg-paper/80 backdrop-blur-md border-b border-black/5 md:hidden"
      >
        <h1 
          className="text-[28px] font-black tracking-tighter leading-none cursor-pointer" 
          onClick={() => { setView('WORK'); window.scrollTo(0, 0); }}
        >
          EUNOIA
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[55] bg-paper flex flex-col items-center justify-center space-y-8 md:hidden"
          >
            <NavItem label="About" target="ABOUT" />
            <NavItem label="Work" target="WORK" />
            <NavItem label="Graduation Project" target="GRADUATION_PROJECT" />
            <NavItem label="Blog" target="BLOG" />
            <NavItem label="Contact" target="CONTACT" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row">
        {/* --- Sidebar (Desktop) --- */}
        <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 p-12 border-r border-black/5 z-50 bg-paper">
          <div className="mb-20">
            <h1 
              className="text-[44px] font-black tracking-tighter cursor-pointer leading-[0.8] hover:text-[#78C7FE] transition-colors duration-500" 
              onClick={() => { setView('WORK'); window.scrollTo(0, 0); }}
              onMouseEnter={() => setCursorText('HOME')}
              onMouseLeave={() => setCursorText(undefined)}
            >
              EUNOIA
            </h1>
            <div className="w-8 h-[1px] bg-black/20 mt-6"></div>
            <p className="text-[10px] uppercase tracking-[0.4em] opacity-50 mt-6 leading-relaxed font-bold">
              Creative<br />UI/UX Designer
            </p>
          </div>

          <nav className="flex flex-col space-y-8 items-start">
            <NavItem label="About" target="ABOUT" />
            <NavItem label="Work" target="WORK" />
            <NavItem label="Graduation Project" target="GRADUATION_PROJECT" />
            <NavItem label="Blog" target="BLOG" />
            <NavItem label="Contact" target="CONTACT" />
          </nav>

          <div className="mt-auto space-y-8">
            <div className="flex gap-4 opacity-60">
              <Instagram size={16} className="cursor-pointer hover:text-brand-green transition-colors" />
              <Mail size={16} className="cursor-pointer hover:text-brand-green transition-colors" />
            </div>
            <button 
              onClick={() => setView('ADMIN')}
              className="text-[9px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2 font-bold"
            >
              <Settings size={12} /> System Admin
            </button>
          </div>
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1 md:ml-72">
          <AnimatePresence>
            {selectedProject && (
              <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
            )}
            {selectedBlog && (
              <BlogModal blog={selectedBlog} onClose={() => setSelectedBlog(null)} />
            )}
            {selectedGraduationPost && (
              <GraduationModal post={selectedGraduationPost} onClose={() => setSelectedGraduationPost(null)} />
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="h-screen flex items-center justify-center">
              <Loader2 className="animate-spin text-brand-green" size={32} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {view === 'WORK' && (
                <motion.div
                  key="work"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Hero />
                  <div id="work-grid" className="saworl-grid border-t border-black/5">
                    {works.map((work, index) => {
                      // Pattern: 0 is large, 1,2 are small, 3 is large, 4,5 are small...
                      const isLarge = index % 3 === 0;
                      return (
                        <motion.div 
                          key={work.id}
                          initial={{ opacity: 0, y: 50 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-100px" }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          onClick={() => setSelectedProject(work)}
                          onMouseEnter={() => setCursorText('VIEW')}
                          onMouseLeave={() => setCursorText(undefined)}
                          className={`relative overflow-hidden group bg-gray-50 cursor-pointer ${isLarge ? 'md:col-span-2 aspect-[16/9]' : 'aspect-[1/1]'}`}
                        >
                          <img
                            src={work.imageUrl}
                            alt={work.title}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8 md:p-12 text-white">
                            <motion.p 
                              initial={{ y: 20, opacity: 0 }}
                              whileInView={{ y: 0, opacity: 0.7 }}
                              className="text-[10px] uppercase tracking-[0.3em] mb-2"
                            >
                              {work.category}
                            </motion.p>
                            <motion.h3 
                              initial={{ y: 20, opacity: 0 }}
                              whileInView={{ y: 0, opacity: 1 }}
                              className="text-xl md:text-2xl font-bold tracking-tight"
                            >
                              {work.title}
                            </motion.h3>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {view === 'GRADUATION_PROJECT' && (
                <motion.div
                  key="graduation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-8 md:px-20 py-40 min-h-screen"
                >
                  <div className="max-w-4xl mx-auto">
                    <header className="mb-20">
                      <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">GRADUATION<br />PROJECT</h2>
                      <p className="text-lg opacity-60 tracking-tight">Weekly updates on my final year design project.</p>
                    </header>
                    
                    <div className="space-y-32">
                      {graduationPosts.map((post, index) => (
                        <motion.article 
                          key={post.id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="group cursor-pointer"
                          onClick={() => setSelectedGraduationPost(post)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                            <div className="md:col-span-1">
                              <span className="text-4xl font-black opacity-20 group-hover:opacity-100 group-hover:text-[#78C7FE] transition-all duration-500">
                                {String(post.week).padStart(2, '0')}
                              </span>
                            </div>
                            <div className="md:col-span-5">
                              {post.imageUrl && (
                                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                                  <img 
                                    src={post.imageUrl} 
                                    alt={post.title} 
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="md:col-span-6 space-y-4">
                              <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">Week {post.week} — {post.date}</span>
                              <h3 className="text-3xl md:text-4xl font-bold tracking-tight group-hover:text-[#78C7FE] transition-colors">{post.title}</h3>
                              <p className="text-lg opacity-60 line-clamp-2 leading-relaxed break-keep">{post.content}</p>
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest pt-4">
                                <span>Read More</span>
                                <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'ABOUT' && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-paper"
                >
                  {/* Hero Slogan */}
                  <section className="min-h-screen flex items-center justify-center px-8 md:px-20 py-40">
                    <div className="w-full">
                      <RevealText className="mb-4">
                        <span className="text-[10px] uppercase tracking-[0.5em] opacity-60 font-bold">About Ji Eun Lee</span>
                      </RevealText>
                      <h2 className="text-[12vw] md:text-[9vw] font-black tracking-tighter leading-[0.85] uppercase">
                        <RevealText>Communication</RevealText>
                        <RevealText delay={0.1}>through</RevealText>
                        <RevealText delay={0.2}><span className="text-brand-gradient">empathy</span></RevealText>
                      </h2>
                    </div>
                  </section>

                  {/* Intro Section */}
                  <section className="py-60 px-8 md:px-20 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
                      <div className="md:col-span-4">
                        <RevealText>
                          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-[#78C7FE]">What I do</h3>
                        </RevealText>
                      </div>
                      <div className="md:col-span-8 space-y-12">
                        <RevealText>
                          <h4 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight">
                            사람을 사랑하는 디자이너 <br />
                            <span className="hover:text-brand-green transition-colors duration-500 cursor-default">이지은</span>입니다.
                          </h4>
                        </RevealText>
                        <RevealText delay={0.2}>
                          <p className="text-xl md:text-2xl font-normal leading-relaxed opacity-70 max-w-2xl break-keep">
                            사람에 대한 애정을 바탕으로 더 나은 경험을 만들어가기 위해 소통합니다. 
                            논리적인 피드백과 <span className="text-brand-gradient font-bold">AI 활용 능력</span>을 통해 
                            디지털 환경에서의 새로운 가능성을 탐구합니다.
                          </p>
                        </RevealText>
                      </div>
                    </div>
                  </section>

                  {/* Full-bleed Image 1 */}
                  <section className="h-[80vh] w-full overflow-hidden relative">
                    <ParallaxSection speed={0.2} className="h-full w-full">
                      <img 
                        src="https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=2000" 
                        alt="Design Process" 
                        className="w-full h-[120%] object-cover grayscale"
                        referrerPolicy="no-referrer"
                      />
                    </ParallaxSection>
                    <div className="absolute inset-0 bg-black/20"></div>
                  </section>

                  {/* UIUX Design Section */}
                  <section className="py-60 px-8 md:px-20 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
                      <div className="md:col-span-4">
                        <RevealText>
                          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-[#78C7FE]">UIUX Design</h3>
                        </RevealText>
                      </div>
                      <div className="md:col-span-8">
                        <RevealText>
                          <p className="text-2xl md:text-4xl font-normal leading-snug tracking-tight break-keep">
                            공감하는 마음으로 경험을 만들어갑니다. 사용자와 환경, 맥락을 조사하고 적합한 모델을 세운 뒤 
                            사용자 경험을 구성하는 개별 요소의 디자인 방향을 잡습니다. 
                            사용성과 유용성은 물론 <span className="text-brand-gradient font-bold">감성과 신뢰성</span>까지 충족하는 경험을 설계합니다.
                          </p>
                        </RevealText>
                      </div>
                    </div>
                  </section>

                  {/* Brand Experience Section */}
                  <section className="py-60 px-8 md:px-20 bg-black text-white">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-20">
                      <div className="md:col-span-4">
                        <RevealText>
                          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Brand Experience</h3>
                        </RevealText>
                      </div>
                      <div className="md:col-span-8">
                        <RevealText>
                          <p className="text-2xl md:text-4xl font-normal leading-snug tracking-tight break-keep">
                            브랜드 경험은 다양한 매체로 전달됩니다. 브랜드 가치와 본질에 상응하는 표현을 찾고 
                            시각적으로, 경험적으로 일관되게 다듬습니다. 
                            소비자가 브랜드와 만나는 모든 접점에서 <span className="text-brand-gradient font-bold">하나의 브랜드 가치</span>를 중심으로 경험을 디자인합니다.
                          </p>
                        </RevealText>
                      </div>
                    </div>
                  </section>

                  {/* Full-bleed Image 2 */}
                  <section className="h-[80vh] w-full overflow-hidden relative">
                    <ParallaxSection speed={-0.2} className="h-full w-full">
                      <img 
                        src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2000" 
                        alt="Technology" 
                        className="w-full h-[120%] object-cover grayscale brightness-50"
                        referrerPolicy="no-referrer"
                      />
                    </ParallaxSection>
                  </section>

                  {/* Marketing Section */}
                  <section className="py-60 px-8 md:px-20 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
                      <div className="md:col-span-4">
                        <RevealText>
                          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Marketing</h3>
                        </RevealText>
                      </div>
                      <div className="md:col-span-8">
                        <RevealText>
                          <p className="text-2xl md:text-4xl font-normal leading-snug tracking-tight break-keep">
                            브랜드의 관점에서 출발합니다. 브랜드의 본질을 따르는 전략과 정체성을 굳게 다지는 
                            창의적 표현법을 중심으로 온라인과 오프라인, 디지털과 피지컬 모두를 아우르는 
                            통합적이고, 전방위적인 <span className="text-brand-gradient font-bold">마케팅 커뮤니케이션</span>을 실행합니다.
                          </p>
                        </RevealText>
                      </div>
                    </div>
                  </section>

                  {/* Info Section */}
                  <section className="py-40 px-8 md:px-20 max-w-7xl mx-auto space-y-32">
                    {/* Profile & Education */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Profile & Education</h3>
                      </div>
                      <div className="md:col-span-8 space-y-4">
                        <p className="text-xl md:text-2xl font-medium tracking-tight">이지은 / JIEUN LEE (2002.04.18)</p>
                        <p className="text-lg md:text-xl font-normal opacity-70">숙명여자대학교 시각영상디자인과 22학번</p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Skills</h3>
                      </div>
                      <div className="md:col-span-8">
                        <div className="flex flex-wrap gap-x-10 gap-y-4">
                          {["Figma", "Photoshop", "Illustrator", "After Effects", "Midjourney", "Runway"].map((skill) => (
                            <motion.span 
                              key={skill}
                              whileHover={{ scale: 1.05, color: "#6399EF" }}
                              className="text-2xl md:text-4xl font-black tracking-tighter cursor-default transition-colors duration-300"
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Paper */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Paper</h3>
                      </div>
                      <div className="md:col-span-8">
                        <p className="text-xl md:text-2xl font-normal leading-relaxed italic opacity-80 break-keep">
                          "AI 기반 돌봄 모니터링 어플리케이션의 UX 디자인 연구 : 신생아 육아 서비스를 중심으로 / 한국디자인학회"
                        </p>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Activities</h3>
                      </div>
                      <div className="md:col-span-8 space-y-12">
                        {[
                          { year: "2025", items: ["대학생 연합 IT 벤처창업 동아리 SOPT 37기 디자인파트", "대학생 연합 IT 동아리 잇타(IT's TIME) 7기", "UMC 8기 디자인 파트"] },
                          { year: "2024", items: ["록시땅 코리아 시어캠퍼스 9기", "신한투자증권 UXUI 산학 프로젝트", "아모레퍼시픽 AI 팀 산학 프로젝트"] },
                          { year: "2023", items: ["숙명여대 미술대학 홍보대사 SAA", "연합영상기획 동아리 'Uni-ON'"] }
                        ].map((group) => (
                          <div key={group.year} className="space-y-4">
                            <span className="text-xs font-bold opacity-50">{group.year}</span>
                            <ul className="space-y-3">
                              {group.items.map((item) => (
                                <motion.li 
                                  key={item}
                                  whileHover={{ x: 10, color: "#6399EF" }}
                                  className="text-lg md:text-xl font-normal transition-all duration-300 cursor-default"
                                >
                                  {item}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Awards */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Awards</h3>
                      </div>
                      <div className="md:col-span-8 space-y-8">
                        <div className="flex gap-10 items-start">
                          <span className="text-xs font-bold opacity-50 pt-1">2 0 2 5</span>
                          <div className="space-y-2">
                            <p className="text-lg md:text-xl font-normal break-keep">대학생 연합 IT 동아리 잇타 ( I T ' s T I M E ) 최우수상</p>
                            <p className="text-lg md:text-xl font-normal break-keep">대학생 연합 IT 벤처창업 동아리 SOPT 우수상</p>
                          </div>
                        </div>
                        <div className="flex gap-10 items-start">
                          <span className="text-xs font-bold opacity-50 pt-1">2 0 2 3</span>
                          <p className="text-lg md:text-xl font-normal break-keep">제4회 한의약 홍보 콘텐츠 공모전 우수상</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-black/10 pt-12 pb-20">
                      <div className="md:col-span-4">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#78C7FE]">Contact</h3>
                      </div>
                      <div className="md:col-span-8">
                        <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                          <a href="tel:01040381134" className="group">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 block mb-2">Phone</span>
                            <span className="text-xl md:text-2xl font-normal group-hover:text-brand-green transition-colors">010.4038.1134</span>
                          </a>
                          <a href="https://instagram.com/2.eunoia" target="_blank" rel="noopener noreferrer" className="group">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 block mb-2">Instagram</span>
                            <span className="text-xl md:text-2xl font-normal group-hover:text-brand-green transition-colors">@2.eunoia</span>
                          </a>
                          <a href="mailto:wldms2418@sookmyung.ac.kr" className="group">
                            <span className="text-[10px] uppercase tracking-widest opacity-60 block mb-2">Email</span>
                            <span className="text-xl md:text-2xl font-normal group-hover:text-brand-green transition-colors underline underline-offset-8">wldms2418@sookmyung.ac.kr</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {view === 'BLOG' && (
                <motion.div
                  key="blog"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-5xl mx-auto py-32 px-8 md:px-20"
                >
                  <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-24">INSIGHTS</h2>
                  <div className="space-y-32">
                    {blogs.map((post, index) => (
                      <motion.article 
                        key={post.id} 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="group cursor-pointer border-b border-black/5 pb-20"
                        onClick={() => setSelectedBlog(post)}
                        onMouseEnter={() => setCursorText('READ')}
                        onMouseLeave={() => setCursorText(undefined)}
                      >
                        <div className="flex flex-col md:flex-row gap-12 md:gap-20">
                          {post.imageUrl && (
                            <div className="w-full md:w-2/5 aspect-[4/3] overflow-hidden bg-gray-50">
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-6 pt-4">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] uppercase tracking-[0.3em] opacity-50">{post.date}</span>
                              <div className="h-[1px] w-8 bg-black/10"></div>
                            </div>
                            <h3 className="text-3xl md:text-5xl font-black tracking-tighter group-hover:text-brand-green transition-colors duration-500">{post.title}</h3>
                            <p className="text-base md:text-lg leading-relaxed opacity-70 font-normal line-clamp-3 whitespace-pre-wrap break-keep">{post.content}</p>
                            <div className="pt-6 flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] font-bold group-hover:gap-8 transition-all duration-500">
                              Explore Article <ChevronRight size={14} className="text-[#78C7FE]" />
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                  {blogs.length === 0 && (
                    <p className="text-sm opacity-60 text-center py-20">No insights shared yet.</p>
                  )}
                </motion.div>
              )}

              {view === 'CONTACT' && about && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-screen flex flex-col items-center justify-center text-center px-8"
                >
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="text-[10px] uppercase tracking-[0.5em] mb-8 opacity-60"
                  >
                    Available for new projects
                  </motion.p>
                  <h2 className="text-[10vw] md:text-[8vw] font-black tracking-tighter leading-none mb-16">
                    LET'S <span className="text-brand-gradient">TALK</span>
                  </h2>
                  <div className="flex flex-col space-y-6 text-xl md:text-3xl font-normal">
                    <a 
                      href={`mailto:${about?.email || ''}`} 
                      onMouseEnter={() => setCursorText('MAIL')}
                      onMouseLeave={() => setCursorText(undefined)}
                      className="hover:text-brand-green transition-colors flex items-center justify-center gap-6 group"
                    >
                      {about?.email || 'No Email'} <ExternalLink size={24} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </a>
                    <a 
                      href={`tel:${about?.phone || ''}`} 
                      onMouseEnter={() => setCursorText('CALL')}
                      onMouseLeave={() => setCursorText(undefined)}
                      className="hover:text-brand-green transition-colors"
                    >
                      {about?.phone || 'No Phone'}
                    </a>
                    <div className="flex justify-center gap-12 pt-12">
                      <a href="https://instagram.com/2.eunoia" target="_blank" rel="noreferrer" className="text-sm uppercase tracking-[0.4em] hover:text-brand-green transition-colors">Instagram</a>
                      <a href="#" className="text-sm uppercase tracking-[0.4em] hover:text-brand-green transition-colors">LinkedIn</a>
                      <a href="#" className="text-sm uppercase tracking-[0.4em] hover:text-brand-green transition-colors">Behance</a>
                    </div>
                  </div>
                </motion.div>
              )}

              {view === 'ADMIN' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-4xl mx-auto py-32 px-8 md:px-20"
                >
              {!isAdmin ? (
                <div className="max-w-md mx-auto text-center">
                  <h2 className="text-xl font-bold mb-8">Admin Access</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-none focus:outline-none focus:border-brand-green"
                    />
                    {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                    <button type="submit" className="w-full bg-black text-white p-3 text-xs uppercase tracking-widest hover:bg-brand-gradient hover:text-black transition-colors font-bold">
                      Login
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-16">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                    <button onClick={() => setIsAdmin(false)} className="text-xs uppercase tracking-widest opacity-80 font-bold flex items-center gap-2">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>

                  {/* About Management */}
                  <section>
                    <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Edit Profile</h3>
                    <form onSubmit={handleUpdateAbout} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase opacity-80 font-bold">Slogan</label>
                        <input
                          value={about?.slogan || ''}
                          onChange={(e) => setAbout(prev => prev ? { ...prev, slogan: e.target.value } : null)}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green font-normal"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase opacity-80 font-bold">Description</label>
                        <textarea
                          value={about?.description || ''}
                          onChange={(e) => setAbout(prev => prev ? { ...prev, description: e.target.value } : null)}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-24 font-normal"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FileUpload 
                          label="Profile Image" 
                          onUpload={(url) => setAbout(prev => prev ? { ...prev, imageUrl: url } : null)} 
                        />
                        {about?.imageUrl && (
                          <div className="mt-2 w-20 h-20 bg-gray-50 border border-gray-100 overflow-hidden">
                            <img src={about.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase opacity-80 font-bold">Email</label>
                        <input
                          value={about?.email || ''}
                          onChange={(e) => setAbout(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green font-normal"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase opacity-80 font-bold">Phone</label>
                        <input
                          value={about?.phone || ''}
                          onChange={(e) => setAbout(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green font-normal"
                        />
                      </div>
                      <button type="submit" className="md:col-span-2 bg-black text-white p-3 text-xs uppercase tracking-widest font-bold">
                        Save Changes
                      </button>
                    </form>
                  </section>

                  {/* Work Management */}
                  {editingWorkId ? (
                    <WorkDetailEditor workId={editingWorkId} onBack={() => setEditingWorkId(null)} />
                  ) : (
                    <section>
                      <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Manage Work</h3>
                      <form onSubmit={handleAddWork} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 items-end">
                        <input
                          placeholder="Title"
                          value={newWork.title}
                          onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
                          className="p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                        />
                        <input
                          placeholder="Category"
                          value={newWork.category}
                          onChange={(e) => setNewWork({ ...newWork, category: e.target.value })}
                          className="p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                        />
                        <div className="space-y-2">
                          <FileUpload 
                            label="Project Image" 
                            onUpload={(url) => setNewWork({ ...newWork, imageUrl: url })} 
                          />
                          {newWork.imageUrl && (
                            <div className="w-10 h-10 bg-gray-50 border border-gray-100 overflow-hidden">
                              <img src={newWork.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                        <button type="submit" className="bg-brand-green text-black p-2 text-xs uppercase tracking-widest flex items-center justify-center gap-2 h-10 font-bold">
                          <Plus size={14} /> Add Work
                        </button>
                      </form>

                      <div className="space-y-4">
                        {works.map(work => (
                          <div key={work.id} className="flex items-center justify-between p-4 border border-gray-100">
                            <div className="flex items-center gap-4">
                              <img src={work.imageUrl} className="w-12 h-12 object-cover" alt="" referrerPolicy="no-referrer" />
                              <div>
                                <p className="text-sm font-bold">{work.title}</p>
                                <p className="text-[10px] uppercase opacity-80 font-bold">{work.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setEditingWorkId(work.id)}
                                className="text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 hover:text-brand-green transition-all"
                              >
                                Edit Details
                              </button>
                              <button onClick={() => handleDeleteWork(work.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Blog Management */}
                  {editingBlogId ? (
                    <BlogDetailEditor blogId={editingBlogId} onBack={() => setEditingBlogId(null)} />
                  ) : (
                    <section>
                      <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Manage Blog</h3>
                      <form onSubmit={handleAddBlog} className="space-y-4 mb-12">
                        <input
                          placeholder="Post Title"
                          value={newBlog.title}
                          onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                        />
                        <FileUpload 
                          label="Blog Images (Multiple)" 
                          multiple={true}
                          onUploads={(urls) => setNewBlog({ ...newBlog, images: urls, imageUrl: urls[0] || '' })} 
                        />
                        {newBlog.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-2">
                            {newBlog.images.map((url, idx) => (
                              <div key={idx} className="w-16 h-16 border border-gray-100 flex-shrink-0">
                                <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          placeholder="Post Content"
                          value={newBlog.content}
                          onChange={(e) => setNewBlog({ ...newBlog, content: e.target.value })}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-32"
                        />
                        <button type="submit" className="bg-brand-green text-black p-2 text-xs uppercase tracking-widest flex items-center justify-center gap-2 font-bold">
                          <Plus size={14} /> Add Post
                        </button>
                      </form>

                      <div className="space-y-4">
                        {blogs.map(post => (
                          <div key={post.id} className="flex items-center justify-between p-4 border border-gray-100">
                            <div className="flex items-center gap-4">
                              {post.imageUrl && <img src={post.imageUrl} className="w-12 h-12 object-cover" alt="" referrerPolicy="no-referrer" />}
                              <div>
                                <p className="text-sm font-bold">{post.title}</p>
                                <p className="text-[10px] uppercase opacity-80 font-bold">{post.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setEditingBlogId(post.id)}
                                className="text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 hover:text-brand-green transition-all"
                              >
                                Edit Details
                              </button>
                              <button onClick={() => handleDeleteBlog(post.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Graduation Project Management */}
                  {editingGraduationId ? (
                    <GraduationDetailEditor graduationId={editingGraduationId} onBack={() => setEditingGraduationId(null)} />
                  ) : (
                    <section>
                      <h3 className="text-xs uppercase tracking-widest font-bold mb-6 text-brand-green">Manage Graduation Project</h3>
                      <form onSubmit={handleAddGraduation} className="space-y-4 mb-12">
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="number"
                            placeholder="Week"
                            value={newGraduation.week}
                            onChange={(e) => setNewGraduation({ ...newGraduation, week: parseInt(e.target.value) })}
                            className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                          />
                          <input
                            placeholder="Post Title"
                            value={newGraduation.title}
                            onChange={(e) => setNewGraduation({ ...newGraduation, title: e.target.value })}
                            className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green"
                          />
                        </div>
                        <FileUpload 
                          label="Graduation Project Images (Multiple)" 
                          multiple={true}
                          onUploads={(urls) => setNewGraduation({ ...newGraduation, images: urls, imageUrl: urls[0] || '' })} 
                        />
                        {newGraduation.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-2">
                            {newGraduation.images.map((url, idx) => (
                              <div key={idx} className="w-16 h-16 border border-gray-100 flex-shrink-0">
                                <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          placeholder="Post Content"
                          value={newGraduation.content}
                          onChange={(e) => setNewGraduation({ ...newGraduation, content: e.target.value })}
                          className="w-full p-2 border-b border-gray-200 focus:outline-none focus:border-brand-green h-32"
                        />
                        <button type="submit" className="bg-brand-green text-black p-2 text-xs uppercase tracking-widest flex items-center justify-center gap-2 font-bold">
                          <Plus size={14} /> Add Graduation Post
                        </button>
                      </form>

                      <div className="space-y-4">
                        {graduationPosts.map(post => (
                          <div key={post.id} className="flex items-center justify-between p-4 border border-gray-100">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold opacity-40">W{post.week}</span>
                              {post.imageUrl && <img src={post.imageUrl} className="w-12 h-12 object-cover" alt="" referrerPolicy="no-referrer" />}
                              <div>
                                <p className="text-sm font-bold">{post.title}</p>
                                <p className="text-[10px] uppercase opacity-80 font-bold">{post.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setEditingGraduationId(post.id)}
                                className="text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 hover:text-brand-green transition-all"
                              >
                                Edit Details
                              </button>
                              <button onClick={() => handleDeleteGraduation(post.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>
    </div>
  </div>
  );
}
