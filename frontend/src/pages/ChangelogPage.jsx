import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

const CHANGELOG_ENTRIES = [
  {
    date: "2026-03-27",
    title: "Pricing plans",
    description: "Free, Builder, Platform, and Enterprise tiers now available with transparent pricing.",
    tag: "new"
  },
  {
    date: "2026-03-27",
    title: "API Playground",
    description: "Interactive playground for testing API endpoints with real data and your actual API key.",
    tag: "new"
  },
  {
    date: "2026-03-27",
    title: "Full API documentation",
    description: "Comprehensive docs with endpoint reference, error codes, trust tiers, and scoring algorithm details.",
    tag: "new"
  },
  {
    date: "2026-03-27",
    title: "Public changelog & roadmap",
    description: "Track what we've shipped and what's coming next. Plus submit feature requests directly.",
    tag: "new"
  },
  {
    date: "2026-03-26",
    title: "Public agent profiles",
    description: "Share your agent's reputation with a public link. Visitors can see score, tier, and outcome history.",
    tag: "new"
  },
  {
    date: "2026-03-26",
    title: "Score breakdown",
    description: "See detailed outcome breakdown by result type on agent detail pages.",
    tag: "improved"
  },
  {
    date: "2026-03-25",
    title: "Flags system",
    description: "Flag problematic outcomes for review. Flagged outcomes are tracked separately in the admin panel.",
    tag: "new"
  },
  {
    date: "2026-03-24",
    title: "Webhook notifications",
    description: "Get real-time notifications when outcomes are logged via configurable webhook endpoints.",
    tag: "new"
  },
  {
    date: "2026-03-23",
    title: "SVG badges",
    description: "Embed live reputation badges anywhere with dynamic SVG that updates in real-time.",
    tag: "new"
  },
  {
    date: "2026-03-21",
    title: "Initial MVP launch",
    description: "Agent registration, outcome logging, trust scoring, and API key management.",
    tag: "new"
  }
];

const ROADMAP = {
  inProgress: [
    "Safe-Spend integration",
    "AAV cross-linking",
    "npm SDK (agentic-rep)"
  ],
  planned: [
    "MCP server for OpenClaw/Claude",
    "GitHub owner verification",
    "Evidence hash verification",
    "Dispute resolution",
    "Team/org aggregate scoring"
  ],
  exploring: [
    "ZK attestation",
    "Agent-to-agent trust routing API",
    "Compliance export"
  ]
};

function TagBadge({ tag }) {
  const styles = {
    new: "bg-[#01696F]/20 text-[#01696F]",
    improved: "bg-blue-500/20 text-blue-400",
    fixed: "bg-yellow-500/20 text-yellow-400"
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles[tag]}`}>
      {tag}
    </span>
  );
}

function ChangelogEntry({ entry }) {
  return (
    <div className="flex gap-4 pb-8 last:pb-0">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-[#01696F] flex-shrink-0 mt-1.5" />
        <div className="w-px flex-1 bg-white/[0.08] mt-2" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs text-gray-500 font-mono">{entry.date}</span>
          <TagBadge tag={entry.tag} />
        </div>
        <h3 className="text-white font-medium mb-1">{entry.title}</h3>
        <p className="text-sm text-gray-400">{entry.description}</p>
      </div>
    </div>
  );
}

function RoadmapColumn({ title, items, color }) {
  const colorStyles = {
    teal: "border-[#01696F]/50 bg-[#01696F]/5",
    blue: "border-blue-500/50 bg-blue-500/5",
    purple: "border-purple-500/50 bg-purple-500/5"
  };

  const dotStyles = {
    teal: "bg-[#01696F]",
    blue: "bg-blue-500",
    purple: "bg-purple-500"
  };

  return (
    <div className={`border rounded-lg p-5 ${colorStyles[color]}`}>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${dotStyles[color]} mt-2 flex-shrink-0`} />
            <span className="text-sm text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureRequestForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/feature-requests`, {
        title: title.trim(),
        description: description.trim(),
        email: email.trim() || null
      });
      
      toast.success("Feature request submitted! Thank you for your feedback.");
      setTitle("");
      setDescription("");
      setEmail("");
    } catch (error) {
      console.error("Failed to submit feature request:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0C1116] border border-white/[0.08] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Request a Feature</h3>
      <p className="text-sm text-gray-400 mb-6">
        Have an idea that would make RepLedger better? We'd love to hear it.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your idea"
            className="w-full bg-[#050709] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F]"
            maxLength={200}
            data-testid="feature-request-title"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your feature idea in detail..."
            rows={4}
            className="w-full bg-[#050709] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F] resize-none"
            maxLength={2000}
            data-testid="feature-request-description"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Email <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-[#050709] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F]"
            data-testid="feature-request-email"
          />
          <p className="text-xs text-gray-600 mt-1">We'll notify you if we build it</p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          data-testid="feature-request-submit"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </button>
      </div>
    </form>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/developers" className="text-sm text-gray-400 hover:text-white transition-colors">
              Developers
            </Link>
            <Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
              API Reference
            </Link>
            <Link to="/changelog" className="text-sm text-white transition-colors">
              Changelog
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-[#01696F] hover:bg-[#015858] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 px-6 border-b border-white/[0.06]">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-['Space_Grotesk']">
              Changelog & Roadmap
            </h1>
            <p className="text-lg text-gray-400">
              Track what we've shipped and what's coming next.
            </p>
          </div>
        </section>

        {/* Changelog Timeline */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 font-['Space_Grotesk']">
              Recent Updates
            </h2>
            <div className="pl-2">
              {CHANGELOG_ENTRIES.map((entry, idx) => (
                <ChangelogEntry key={idx} entry={entry} />
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-16 px-6 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 font-['Space_Grotesk']">
              Roadmap
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RoadmapColumn 
                title="In Progress" 
                items={ROADMAP.inProgress} 
                color="teal" 
              />
              <RoadmapColumn 
                title="Planned" 
                items={ROADMAP.planned} 
                color="blue" 
              />
              <RoadmapColumn 
                title="Exploring" 
                items={ROADMAP.exploring} 
                color="purple" 
              />
            </div>
          </div>
        </section>

        {/* Feature Request Form */}
        <section className="py-16 px-6 border-t border-white/[0.06]">
          <div className="max-w-xl mx-auto">
            <FeatureRequestForm />
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
