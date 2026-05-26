import { Link } from "react-router-dom";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_ac636d4a_6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

const ECOSYSTEM_LINKS = [
  { href: "https://safe-spend.dev", label: "Safe-Spend" },
  { href: "https://agentauthority.dev", label: "Agent Authority Vault" },
  { href: "https://agentictrust.app", label: "AgenticTrust" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left — brand */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#01696F] to-[#014F52] rounded flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-500">
              &copy; {year} RepLedger
            </span>
          </div>
          <span className="text-[12px] text-[#4B5563]">
            Part of the AgenticTrust stack
          </span>
        </div>

        {/* Center — Ecosystem */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">
            Ecosystem
          </span>
          <div className="flex items-center gap-4">
            {ECOSYSTEM_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#6B7280] hover:text-[#F9FAFB] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right — internal nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/docs"
            className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            Docs
          </Link>
          <Link
            to="/changelog"
            className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            Changelog
          </Link>
          <Link
            to="/pricing"
            className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            Pricing
          </Link>
          <a
            href="mailto:support@agentictrust.app"
            className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}