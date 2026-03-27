import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { billingAPI } from "../lib/api";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    agents: "1 agent",
    outcomes: "100 outcomes/mo",
    features: [
      "Basic trust score",
      "Public badge embed",
      "Public agent profile",
      "60 API requests/min",
      "Community support"
    ],
    cta: "Get Started",
    ctaLink: "/signup",
    highlighted: false
  },
  {
    name: "Builder",
    price: "$29",
    period: "/month",
    agents: "10 agents",
    outcomes: "5,000 outcomes/mo",
    features: [
      "Everything in Free",
      "Webhook notifications",
      "API key management",
      "300 API requests/min",
      "MCP server access",
      "Priority email support"
    ],
    cta: "Start Building",
    ctaLink: "/signup",
    highlighted: true,
    badge: "Recommended"
  },
  {
    name: "Platform",
    price: "$99",
    period: "/month",
    agents: "Unlimited agents",
    outcomes: "100,000 outcomes/mo",
    features: [
      "Everything in Builder",
      "Platform API access",
      "1,000 API requests/min",
      "White-label badges",
      "Anti-manipulation protection",
      "10 team members"
    ],
    cta: "Scale Up",
    ctaLink: "/signup",
    highlighted: false
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    agents: "Unlimited agents",
    outcomes: "Unlimited outcomes",
    features: [
      "Everything in Platform",
      "Custom API rate limits",
      "ZK attestation",
      "Compliance export",
      "SLA guarantee",
      "AAV integration",
      "Dedicated support"
    ],
    cta: "Contact Sales",
    ctaLink: "mailto:hello@agentictrust.com",
    highlighted: false
  }
];

const FAQ_ITEMS = [
  {
    question: "Can I switch plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences in billing."
  },
  {
    question: "What happens when I hit my outcome limit?",
    answer: "When you reach your monthly outcome limit, new outcomes will stop recording until your next billing cycle. Your existing data, scores, and badges remain accessible and unchanged."
  },
  {
    question: "Do I need a paid plan for public badges?",
    answer: "No, the Free plan includes public badges. You can embed your agent's reputation badge anywhere, even on the free tier."
  },
  {
    question: "What counts as an outcome?",
    answer: "Any POST request to the /api/v1/agents/{agent_id}/outcomes endpoint counts as one outcome. This includes successful, failed, partial, and timeout results."
  }
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left"
        data-testid={`faq-toggle-${question.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`}
      >
        <span className="text-white font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-40 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-gray-400 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function PricingCard({ tier, user, onCheckout, checkoutLoading }) {
  const isExternal = tier.ctaLink.startsWith("mailto:");
  const isPaid = tier.name === "Builder" || tier.name === "Platform";
  const isEnterprise = tier.name === "Enterprise";
  
  const handleClick = async (e) => {
    if (isPaid && user) {
      e.preventDefault();
      onCheckout(tier.name.toLowerCase());
    }
  };
  
  return (
    <div
      className={`relative bg-[#0C1116] rounded-sm p-6 flex flex-col ${
        tier.highlighted
          ? "border-2 border-[#01696F]"
          : "border border-white/[0.08]"
      }`}
      data-testid={`pricing-card-${tier.name.toLowerCase()}`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-[#01696F] text-white text-xs font-medium rounded-full">
            {tier.badge}
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{tier.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white font-mono">{tier.price}</span>
          {tier.period && <span className="text-gray-500 text-sm">{tier.period}</span>}
        </div>
      </div>

      <div className="mb-6 pb-6 border-b border-white/[0.06]">
        <p className="text-sm text-gray-400">{tier.agents}</p>
        <p className="text-sm text-gray-400">{tier.outcomes}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#01696F] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {isExternal ? (
        <a
          href={tier.ctaLink}
          className={`w-full py-2.5 rounded-lg text-center font-medium transition-colors ${
            tier.highlighted
              ? "bg-[#01696F] hover:bg-[#015858] text-white"
              : "bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]"
          }`}
          data-testid={`pricing-cta-${tier.name.toLowerCase()}`}
        >
          {tier.cta}
        </a>
      ) : isPaid && user ? (
        <button
          onClick={handleClick}
          disabled={checkoutLoading === tier.name.toLowerCase()}
          className={`w-full py-2.5 rounded-lg text-center font-medium transition-colors flex items-center justify-center gap-2 ${
            tier.highlighted
              ? "bg-[#01696F] hover:bg-[#015858] text-white"
              : "bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          data-testid={`pricing-cta-${tier.name.toLowerCase()}`}
        >
          {checkoutLoading === tier.name.toLowerCase() ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            tier.cta
          )}
        </button>
      ) : (
        <Link
          to={tier.ctaLink}
          className={`w-full py-2.5 rounded-lg text-center font-medium transition-colors block ${
            tier.highlighted
              ? "bg-[#01696F] hover:bg-[#015858] text-white"
              : "bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]"
          }`}
          data-testid={`pricing-cta-${tier.name.toLowerCase()}`}
        >
          {tier.cta}
        </Link>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const handleCheckout = async (plan) => {
    if (!user) {
      // Redirect to signup with plan param
      navigate(`/signup?plan=${plan}`);
      return;
    }
    
    setCheckoutLoading(plan);
    try {
      const { checkout_url } = await billingAPI.createCheckoutSession(plan);
      window.location.href = checkout_url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  };

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
            <Link to="/pricing" className="text-sm text-white transition-colors">
              Pricing
            </Link>
            <Link to="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">
              Blog
            </Link>
            <Link to="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
              API Reference
            </Link>
            <Link to="/changelog" className="text-sm text-gray-400 hover:text-white transition-colors">
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
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-['Space_Grotesk']">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Start free. Scale as your agents grow.
            </p>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING_TIERS.map((tier) => (
                <PricingCard 
                  key={tier.name} 
                  tier={tier} 
                  user={user}
                  onCheckout={handleCheckout}
                  checkoutLoading={checkoutLoading}
                />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6 border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center font-['Space_Grotesk']">
              Frequently Asked Questions
            </h2>
            <div className="bg-[#0C1116] border border-white/[0.08] rounded-lg px-6">
              {FAQ_ITEMS.map((item, idx) => (
                <FAQItem
                  key={idx}
                  question={item.question}
                  answer={item.answer}
                  isOpen={openFaq === idx}
                  onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#01696F] to-[#014F52] rounded flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm text-gray-500">© 2026 RepLedger</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-gray-500 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link to="/changelog" className="text-sm text-gray-500 hover:text-white transition-colors">
              Changelog
            </Link>
            <a href="mailto:hello@agentictrust.com" className="text-sm text-gray-500 hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
