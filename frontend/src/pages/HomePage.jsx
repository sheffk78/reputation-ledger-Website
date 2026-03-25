import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { 
  Bot, 
  FileText, 
  Shield, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Code2,
  Layers
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";
const HERO_IMAGE = "https://images.unsplash.com/photo-1667264501379-c1537934c7ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050709]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container-main flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src={LOGO_URL} alt="RepLedger" className="h-7" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/docs" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
              Docs
            </Link>
            <a href="#how-it-works" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
              How it works
            </a>
            <a href="#use-cases" className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
              Use cases
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button 
                variant="ghost" 
                className="text-[#9CA3AF] hover:text-white hover:bg-white/5"
                data-testid="nav-login-btn"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button 
                className="bg-[#01696F] hover:bg-[#028C94] text-white"
                data-testid="nav-signup-btn"
              >
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 hero-gradient">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#01696F]/20 border border-[#01696F]/30 text-[#0BA9B5] text-sm mb-6">
                <Shield className="w-4 h-4" />
                Agent Trust Infrastructure
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-white leading-tight mb-6">
                Every agent earns its record.
              </h1>
              
              <p className="text-lg text-[#9CA3AF] leading-relaxed mb-8 max-w-lg">
                RepLedger is the track record API for autonomous agents. Build verifiable reputation through outcomes, not claims.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/signup">
                  <Button 
                    size="lg"
                    className="bg-[#01696F] hover:bg-[#028C94] text-white h-12 px-8"
                    data-testid="hero-cta-btn"
                  >
                    Get API Key
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-white/10 text-white hover:bg-white/5 h-12 px-8"
                  >
                    View Docs
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/10">
                <div>
                  <div className="text-2xl font-bold text-white">API-first</div>
                  <div className="text-sm text-[#6B7280]">Built for agents</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-2xl font-bold text-white">Evidence-backed</div>
                  <div className="text-sm text-[#6B7280]">Real outcomes</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-2xl font-bold text-white">Portable</div>
                  <div className="text-sm text-[#6B7280]">Works anywhere</div>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-[#050709] via-transparent to-transparent z-10" />
              <img 
                src={HERO_IMAGE} 
                alt="Agent Infrastructure" 
                className="rounded-sm opacity-60"
              />
              <div className="absolute bottom-8 left-8 right-8 glass-card p-6 z-20 rounded-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-[#FFD700]/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <div className="text-white font-medium">research-agent-v2</div>
                      <code className="text-xs text-[#6B7280]">agt_7f3k9m2x</code>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-white">87</div>
                    <div className="text-xs text-[#6B7280]">RepLedger Score</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-[#FFD700] text-[#111827] text-xs font-semibold rounded-sm">
                    GOLD
                  </span>
                  <span className="px-2 py-1 bg-white/10 text-white text-xs rounded-sm">
                    342 outcomes
                  </span>
                  <span className="px-2 py-1 bg-white/10 text-white text-xs rounded-sm">
                    94% success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 border-t border-white/5">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white mb-4">
              How RepLedger Works
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto">
              Three simple steps to build your agent's track record
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#0C1116] border border-white/10 rounded-sm p-8">
              <div className="w-12 h-12 rounded-sm bg-[#01696F]/20 flex items-center justify-center mb-6">
                <span className="text-[#01696F] font-mono font-bold text-xl">01</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Register Agent</h3>
              <p className="text-[#9CA3AF] mb-6">
                Create an agent identity in RepLedger with a name and optional metadata. Get a unique agent_id.
              </p>
              <div className="code-block text-xs">
                <code>
                  POST /v1/agents<br />
                  {"{"} "name": "my-agent" {"}"}
                </code>
              </div>
            </div>

            <div className="bg-[#0C1116] border border-white/10 rounded-sm p-8">
              <div className="w-12 h-12 rounded-sm bg-[#01696F]/20 flex items-center justify-center mb-6">
                <span className="text-[#01696F] font-mono font-bold text-xl">02</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Log Outcomes</h3>
              <p className="text-[#9CA3AF] mb-6">
                Submit outcomes as your agent completes tasks. Each outcome is recorded in the ledger.
              </p>
              <div className="code-block text-xs">
                <code>
                  POST /v1/agents/{"{id}"}/outcomes<br />
                  {"{"} "result": "success" {"}"}
                </code>
              </div>
            </div>

            <div className="bg-[#0C1116] border border-white/10 rounded-sm p-8">
              <div className="w-12 h-12 rounded-sm bg-[#01696F]/20 flex items-center justify-center mb-6">
                <span className="text-[#01696F] font-mono font-bold text-xl">03</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Get Score & Badge</h3>
              <p className="text-[#9CA3AF] mb-6">
                Query your agent's reputation score and embed the trust tier badge anywhere.
              </p>
              <div className="code-block text-xs">
                <code>
                  GET /v1/agents/{"{id}"}/score<br />
                  GET /v1/agents/{"{id}"}/badge.svg
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="py-24 border-t border-white/5">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white mb-4">
              Built for Builders
            </h2>
            <p className="text-[#9CA3AF] max-w-2xl mx-auto">
              Whether you're an indie builder, platform operator, or enterprise team
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 border border-white/10 rounded-sm hover:border-white/20 transition-colors">
              <Code2 className="w-10 h-10 text-[#01696F] mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Agent Builders</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Prove your agent works with real data</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Embed badges in READMEs and docs</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Stand out in agent marketplaces</span>
                </li>
              </ul>
            </div>

            <div className="p-8 border border-white/10 rounded-sm hover:border-white/20 transition-colors">
              <Layers className="w-10 h-10 text-[#01696F] mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Platforms</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Surface trust signals on agent listings</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Filter agents by reputation tier</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Verifiable scores via API</span>
                </li>
              </ul>
            </div>

            <div className="p-8 border border-white/10 rounded-sm hover:border-white/20 transition-colors">
              <Building2 className="w-10 h-10 text-[#01696F] mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Enterprise</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Audit trails for agent activity</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Compliance-grade outcome logs</span>
                </li>
                <li className="flex items-start gap-2 text-[#9CA3AF]">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>Governance and oversight data</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5">
        <div className="container-main text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white mb-4">
            Start building your agent's track record
          </h2>
          <p className="text-[#9CA3AF] max-w-xl mx-auto mb-8">
            Get your API key and register your first agent in minutes. Free to start.
          </p>
          <Link to="/signup">
            <Button 
              size="lg"
              className="bg-[#01696F] hover:bg-[#028C94] text-white h-12 px-8"
              data-testid="footer-cta-btn"
            >
              Get API Key
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="container-main flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            <span className="text-[#6B7280] text-sm">
              Part of the AgenticTrust stack
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-[#6B7280] hover:text-white transition-colors">
              Documentation
            </Link>
            <a href="#" className="text-sm text-[#6B7280] hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="text-sm text-[#6B7280] hover:text-white transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
