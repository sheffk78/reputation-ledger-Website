import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, CheckCircle2, Shield, FileText, Users, Building2 } from "lucide-react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

// Mock outcomes for the hero illustration
const mockOutcomes = [
  { task: "research_query", result: "success", time: "2m ago" },
  { task: "data_extraction", result: "success", time: "5m ago" },
  { task: "summarization", result: "failure", time: "12m ago" },
  { task: "code_review", result: "success", time: "18m ago" },
];

// Animated section wrapper
function AnimatedSection({ children, className = "", delay = 0 }) {
  const [ref, isVisible] = useScrollAnimation({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-500 ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-5"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Navigation */}
      <header className="h-14 border-b border-white/[0.06] bg-[#050709]/90 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="container-app flex items-center justify-between h-full">
          <img src={LOGO_URL} alt="RepLedger" className="h-6" />
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              How it works
            </a>
            <a href="#who-its-for" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              Who it's for
            </a>
            <Link to="/pricing" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/docs" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              API Reference
            </Link>
            <Link to="/developers" className="text-[13px] text-[#9CA3AF] hover:text-white transition-colors">
              Developers
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button 
                variant="ghost" 
                className="text-[13px] text-[#9CA3AF] hover:text-white hover:bg-white/5 h-9"
                data-testid="nav-login-btn"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button 
                className="bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px]"
                data-testid="nav-signup-btn"
              >
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#01696F]/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="container-app relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#01696F]/10 border border-[#01696F]/20 text-[11px] font-medium text-[#01696F] uppercase tracking-wider mb-6">
                <Shield className="w-3.5 h-3.5" />
                AgenticTrust Stack
              </div>
              
              <h1 className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-white leading-[1.1] tracking-tight mb-6">
                Every agent earns its record.
              </h1>
              
              <p className="text-[14px] sm:text-[16px] text-[#9CA3AF] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                RepLedger is the track record API for autonomous agents.
                Log your agent's outcomes, get a portable reputation score and trust tier,
                and show a verifiable badge anywhere you publish your agent.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link to="/signup">
                  <Button 
                    size="lg"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white h-11 px-6 text-[14px] w-full sm:w-auto"
                    data-testid="hero-cta-btn"
                  >
                    Start free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link 
                  to="/developers" 
                  className="text-[14px] text-[#01696F] hover:text-[#028C94] font-medium transition-colors"
                >
                  View API quickstart →
                </Link>
              </div>
            </div>

            {/* Right: Mock UI Card */}
            <div className="hidden lg:block">
              <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-6 shadow-2xl">
                {/* Agent header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-[15px] font-semibold text-white mb-1">research-agent-v2</div>
                    <code className="text-[11px] text-[#6B7280] font-mono">agt_7f3k9m2x4p1q</code>
                  </div>
                  <div className="text-right">
                    <div className="text-[32px] font-mono font-bold text-white">82</div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Score</div>
                  </div>
                </div>

                {/* Tier badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="tier-badge tier-gold">Gold</span>
                  <span className="text-[12px] text-[#6B7280]">137 outcomes · 86% success</span>
                </div>

                {/* Mini outcomes table */}
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-3">Recent Outcomes</div>
                  <div className="space-y-2">
                    {mockOutcomes.map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <span className="text-[#9CA3AF] font-mono">{o.task}</span>
                        <div className="flex items-center gap-3">
                          <span className={o.result === "success" ? "text-[#22C55E]" : "text-[#EF4444]"}>
                            {o.result}
                          </span>
                          <span className="text-[#4B5563]">{o.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-white/[0.04]">
        <div className="container-app">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[24px] sm:text-[28px] font-semibold text-white tracking-tight mb-3">
              How RepLedger works
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#6B7280]">
              Three steps to a verifiable track record
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <span className="text-[#01696F] font-mono font-bold text-[14px]">1</span>
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Register your agent</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                Create an agent in RepLedger with a name and optional owner handle
                (like a GitHub username or domain) to anchor its identity.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <span className="text-[#01696F] font-mono font-bold text-[14px]">2</span>
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Log outcomes to the ledger</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                Send simple JSON events every time your agent completes a task.
                RepLedger keeps an append-only history of successes, failures, and incidents.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <span className="text-[#01696F] font-mono font-bold text-[14px]">3</span>
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Get a score and badge</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                RepLedger turns your outcomes into a 0–100 reputation score and trust tier
                (Unrated → Bronze → Silver → Gold → Platinum), plus an embeddable SVG badge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="who-its-for" className="py-16 sm:py-24 border-t border-white/[0.04]">
        <div className="container-app">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[24px] sm:text-[28px] font-semibold text-white tracking-tight mb-3">
              Who RepLedger is for
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-5 sm:p-6">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <FileText className="w-5 h-5 text-[#01696F]" />
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Independent agent builders</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                Prove your agent works with a verifiable record of what it has done,
                not just a README claim or a couple of screenshots.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-5 sm:p-6">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <Users className="w-5 h-5 text-[#01696F]" />
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Agent marketplaces & platforms</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                Show real scores and trust tiers on agent listings so users can
                filter out unreliable agents and fake reviews.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0C1116] border border-white/[0.08] rounded-sm p-5 sm:p-6 sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 rounded-sm bg-[#01696F]/15 flex items-center justify-center mb-5">
                <Building2 className="w-5 h-5 text-[#01696F]" />
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">Teams & enterprises</h3>
              <p className="text-[13px] sm:text-[14px] text-[#9CA3AF] leading-relaxed">
                Use reputation scores and outcome logs to support internal governance,
                compliance reports, and vendor risk reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Not Reviews Section */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="container-app">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-[24px] font-semibold text-white tracking-tight mb-8 text-center">
              Why a ledger, not just reviews
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#01696F] mt-0.5 shrink-0" />
                <p className="text-[14px] text-[#9CA3AF]">
                  <span className="text-white font-medium">Star ratings are easy to fake.</span>{" "}
                  A ledger of outcomes is not.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#01696F] mt-0.5 shrink-0" />
                <p className="text-[14px] text-[#9CA3AF]">
                  <span className="text-white font-medium">RepLedger ties every score to real, timestamped events.</span>{" "}
                  No guessing, no gaming.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#01696F] mt-0.5 shrink-0" />
                <p className="text-[14px] text-[#9CA3AF]">
                  <span className="text-white font-medium">Embed the same trusted badge</span>{" "}
                  across agents, marketplaces, and internal tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="container-app text-center">
          <h2 className="text-[28px] font-semibold text-white tracking-tight mb-4">
            Give your agents a real track record
          </h2>
          <p className="text-[15px] text-[#9CA3AF] max-w-lg mx-auto mb-8">
            Connect your first agent and start building its record in minutes.
            The Free plan includes one agent and enough outcomes to get a real score.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup">
              <Button 
                size="lg"
                className="bg-[#01696F] hover:bg-[#028C94] text-white h-11 px-6 text-[14px]"
                data-testid="footer-cta-btn"
              >
                Start free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link 
              to="/developers" 
              className="text-[14px] text-[#01696F] hover:text-[#028C94] font-medium transition-colors"
            >
              View API quickstart →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.04]">
        <div className="container-app flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="RepLedger" className="h-5" />
            <span className="text-[12px] text-[#4B5563]">Part of the AgenticTrust stack</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/developers" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Developers
            </Link>
            <Link to="/docs" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Docs
            </Link>
            <Link to="/changelog" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Changelog
            </Link>
            <Link to="/login" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="text-[12px] text-[#6B7280] hover:text-white transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
