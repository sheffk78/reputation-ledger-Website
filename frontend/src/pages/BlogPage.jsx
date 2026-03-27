import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, User, ArrowLeft, ArrowRight, Rss } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchPosts();
  }, [page]);

  // Add RSS link to head
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = "RepLedger Blog";
    link.href = `${BACKEND_URL}/api/blog/rss`;
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/blog/posts?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
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
            <span className="text-[13px] text-white font-medium">
              Blog
            </span>
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

      {/* Hero */}
      <section className="py-16 px-6 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight font-['Space_Grotesk'] mb-4">
            RepLedger Blog
          </h1>
          <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
            Insights on agent reputation, trust infrastructure, and the AI agent ecosystem.
          </p>
          <a 
            href={`${BACKEND_URL}/api/blog/rss`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-[13px] text-[#01696F] hover:text-[#028C94] transition-colors"
          >
            <Rss className="w-4 h-4" />
            Subscribe via RSS
          </a>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#0C1116] border border-white/[0.08] rounded-sm overflow-hidden animate-pulse">
                  <div className="h-48 bg-gradient-to-br from-[#01696F]/20 to-[#050709]" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-white/[0.06] rounded w-3/4" />
                    <div className="h-4 bg-white/[0.04] rounded w-full" />
                    <div className="h-4 bg-white/[0.04] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#6B7280] text-lg">No posts yet. Check back soon!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <Link 
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-[#0C1116] border border-white/[0.08] rounded-sm overflow-hidden hover:border-[#01696F]/50 transition-colors"
                    data-testid={`blog-post-card-${post.slug}`}
                  >
                    {/* Cover Image */}
                    {post.cover_image_url ? (
                      <img 
                        src={post.cover_image_url} 
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-[#01696F]/20 to-[#050709] flex items-center justify-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="opacity-20">
                          <rect x="3" y="3" width="18" height="4" rx="1" fill="white"/>
                          <rect x="3" y="10" width="18" height="4" rx="1" fill="white" fillOpacity="0.6"/>
                          <rect x="3" y="17" width="18" height="4" rx="1" fill="white" fillOpacity="0.3"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="p-5">
                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span 
                              key={tag}
                              className="text-[10px] px-2 py-0.5 bg-[#01696F]/10 text-[#01696F] rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Title */}
                      <h2 className="text-[16px] font-semibold text-white font-['Space_Grotesk'] mb-2 group-hover:text-[#01696F] transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      
                      {/* Excerpt */}
                      <p className="text-[13px] text-[#9CA3AF] line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                      
                      {/* Meta */}
                      <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {post.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {post.reading_time} min read
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1.5 text-[13px] text-[#9CA3AF] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-[13px] text-[#6B7280]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1.5 text-[13px] text-[#9CA3AF] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#6B7280]">
            &copy; {new Date().getFullYear()} AgenticTrust. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-[13px] text-[#6B7280] hover:text-white transition-colors">
              Docs
            </Link>
            <Link to="/pricing" className="text-[13px] text-[#6B7280] hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/changelog" className="text-[13px] text-[#6B7280] hover:text-white transition-colors">
              Changelog
            </Link>
            <a 
              href="mailto:hello@agentictrust.com" 
              className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
