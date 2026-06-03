import { Link } from "react-router-dom";
import Footer from "../components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0C1116] text-[#F9FAFB]" data-testid="privacy-page">
      <nav className="border-b border-white/10 bg-[#0C1116]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-[#01696F] transition-colors">RepLedger</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Privacy Policy
        </h1>
        <p className="text-[#9CA3AF] mb-2">
          <strong>Agent Reputation Ledger</strong><br />
          Operated by Agentic Trust
        </p>
        <p className="text-sm text-[#6B7280] mb-12">
          Effective Date: January 2026 · Last Updated: January 2026
        </p>

        <div className="space-y-12">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-[#9CA3AF] mb-4">
              Agentic Trust ("we," "our," or "us") operates Agent Reputation Ledger ("ARL" or "the Service"). This Privacy Policy explains how we collect, use, and protect your information when you use ARL.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">Information You Provide</h3>
            <ul className="list-disc list-inside text-[#9CA3AF] mb-6 space-y-2">
              <li><strong>Account information:</strong> Name, email address, and organization details when you sign up</li>
              <li><strong>Agent registrations:</strong> Agent names, descriptions, and metadata you submit</li>
              <li><strong>Outcome data:</strong> Task results, performance metrics, and evidence you choose to log</li>
              <li><strong>Communication data:</strong> Support requests and correspondence</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-[#9CA3AF] mb-6 space-y-2">
              <li><strong>Usage data:</strong> API calls, page views, feature interactions</li>
              <li><strong>Verification requests:</strong> Third-party lookups of your agent's reputation scores and badges</li>
              <li><strong>Device information:</strong> Browser type, IP address, and general geographic region</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-[#9CA3AF] space-y-2">
              <li>Operating and maintaining the Service</li>
              <li>Computing and updating reputation scores</li>
              <li>Generating verification badges and public agent profiles</li>
              <li>Processing API authentication and rate limiting</li>
              <li>Communicating with you about your account or the Service</li>
              <li>Improving and developing new features</li>
              <li>Detecting and preventing fraud or abuse</li>
            </ul>
          </section>

          {/* Public Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Public Information</h2>
            <p className="text-[#9CA3AF] mb-4">
              By design, some information on ARL is public. Agent reputation scores, badges, and outcome summaries are intended to be verifiable by third parties. When you register an agent and log outcomes, you acknowledge that the resulting reputation data will be publicly accessible via the API and public agent pages.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <p className="text-[#9CA3AF] mb-4">
              We do not sell your personal information. We share data only:
            </p>
            <ul className="list-disc list-inside text-[#9CA3AF] space-y-2">
              <li>As described in this policy (public reputation data)</li>
              <li>With service providers who help us operate the platform (hosting, email delivery)</li>
              <li>When required by law or legal process</li>
              <li>To protect our rights, safety, or property, or that of our users</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <p className="text-[#9CA3AF] mb-4">
              We retain your account information for as long as your account is active. Outcome data contributes to reputation scores and is retained according to your plan's audit log window (7 days for Free, 90 days for Builder, 1 year for Teams, unlimited for Custom). After the retention period, data may be aggregated or anonymized but not deleted, as it contributes to ongoing reputation calculations.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Security</h2>
            <p className="text-[#9CA3AF] mb-4">
              We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and access controls. API keys are hashed and never stored in plaintext. However, no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-[#9CA3AF] mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-[#9CA3AF] space-y-2">
              <li>Access and download your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account (subject to retention requirements for public reputation data)</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
            <p className="text-[#9CA3AF] mb-4">
              ARL is not intended for use by individuals under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-[#9CA3AF] mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on the Service or by email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-[#9CA3AF]">
              Questions about this Privacy Policy? Email us at <a href="mailto:support@agentictrust.app" className="text-[#01696F] hover:underline">support@agentictrust.app</a>.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}