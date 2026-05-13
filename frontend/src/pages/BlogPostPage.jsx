import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Footer from "../components/Footer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const BASE_URL = "https://reputationledger.dev";
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  // Set SEO meta tags
  useEffect(() => {
    if (!post) return;

    // Title
    document.title = `${post.meta_title} | RepLedger`;

    // Helper to set/update meta tags
    const setMetaTag = (name, content, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    // Standard meta
    setMetaTag("description", post.meta_description);
    
    // Open Graph
    setMetaTag("og:type", "article", true);
    setMetaTag("og:title", post.meta_title, true);
    setMetaTag("og:description", post.meta_description, true);
    setMetaTag("og:url", `${BASE_URL}/blog/${post.slug}`, true);
    if (post.social_image_url || post.cover_image_url) {
      setMetaTag("og:image", post.social_image_url || post.cover_image_url, true);
    }
    
    // Twitter
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", post.meta_title);
    setMetaTag("twitter:description", post.meta_description);
    if (post.social_image_url || post.cover_image_url) {
      setMetaTag("twitter:image", post.social_image_url || post.cover_image_url);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = post.canonical_url || `${BASE_URL}/blog/${post.slug}`;

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": post.meta_description,
      "image": post.social_image_url || post.cover_image_url,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "RepLedger",
        "url": BASE_URL
      },
      "datePublished": post.published_at,
      "mainEntityOfPage": `${BASE_URL}/blog/${post.slug}`
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"][data-blog-post]');
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute("data-blog-post", "true");
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);

    // Cleanup
    return () => {
      document.title = "RepLedger | Agent Reputation";
      // Remove blog-specific meta tags
      const tagsToRemove = [
        'meta[property="og:type"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:url"]',
        'meta[property="og:image"]',
        'meta[name="twitter:card"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[name="twitter:image"]',
        'link[rel="canonical"]',
        'script[data-blog-post]'
      ];
      tagsToRemove.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.remove();
      });
    };
  }, [post]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/blog/posts/${slug}`);
      if (response.status === 404) {
        setError("Post not found");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch post");
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709]">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-8 bg-white/[0.06] rounded w-3/4 mb-4" />
          <div className="h-4 bg-white/[0.04] rounded w-1/2 mb-8" />
          <div className="h-64 bg-white/[0.03] rounded mb-8" />
          <div className="space-y-4">
            <div className="h-4 bg-white/[0.04] rounded w-full" />
            <div className="h-4 bg-white/[0.04] rounded w-full" />
            <div className="h-4 bg-white/[0.04] rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050709]">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Post Not Found</h1>
          <p className="text-[#9CA3AF] mb-8">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-[#01696F] hover:text-[#028C94] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709]">
      <Header />
      
      <article className="max-w-3xl mx-auto px-6 py-12" data-testid="blog-post-content">
        {/* Back link */}
        <Link 
          to="/blog"
          className="inline-flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </Link>

        {/* Cover image */}
        {post.cover_image_url && (
          <img 
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-sm max-h-[400px] object-cover mb-8"
          />
        )}

        {/* Title */}
        <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight font-['Space_Grotesk'] mb-4">
          {post.title}
        </h1>

        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B7280] mb-8 pb-8 border-b border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(post.published_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {post.reading_time} min read
          </span>
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2">
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="text-[10px] px-2 py-0.5 bg-[#01696F]/10 text-[#01696F] rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose-repledger">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Author bio */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#01696F] to-[#014F54] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-lg">
                  {post.author.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-white font-medium mb-1">{post.author}</p>
                <p className="text-[13px] text-[#9CA3AF]">
                  Building reputation and trust infrastructure for AI agents at AgenticTrust.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-[13px] text-[#01696F] hover:text-[#028C94] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </Link>
        </div>
      </article>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Shared header component
function Header() {
  return (
    <header className="border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={LOGO_URL} alt="RepLedger" className="h-6" />
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link to="/pricing" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
            Pricing
          </Link>
          <Link to="/docs" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
            Docs
          </Link>
          <Link to="/blog" className="text-[13px] text-white font-medium">
            Blog
          </Link>
          <Link to="/changelog" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
            Changelog
          </Link>
          <Link 
            to="/login"
            className="text-[13px] px-4 py-2 bg-[#01696F] hover:bg-[#028C94] text-white rounded-sm transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
