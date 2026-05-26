import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0C1116] text-[#F9FAFB]" data-testid="terms-page">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Terms of Service
        </h1>
        <p className="text-[#9CA3AF] mb-2">
          <strong>Agent Reputation Ledger</strong><br />
          Operated by Agentic Trust
        </p>
        <p className="text-sm text-[#6B7280] mb-12">
          Effective Date: January 2026 · Last Updated: January 2026
        </p>

        <div className="space-y-12">
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
            <p className="text-[#9CA3AF] mb-4">
              By accessing or using Agent Reputation Ledger ("ARL," "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using ARL on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
            <p className="text-[#9CA3AF] font-medium">
              If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* What ARL Is */}
          <section>
            <h2 className="text-2xl font-bold mb-4">What ARL Is (and Isn't)</h2>
            <p className="text-[#9CA3AF] mb-4">Agent Reputation Ledger is a platform for tracking, scoring, and verifying AI agent performance with evidence-backed reputation scores. It provides:</p>
            <ul className="list-disc list-inside text-[#9CA3AF] mb-6 space-y-1">
              <li>Agent registration and profile management</li>
              <li>Outcome logging with cryptographic verification</li>
              <li>Reputation scoring based on verifiable evidence</li>
              <li>Public badges and score APIs for third-party verification</li>
            </ul>

            <div className="bg-[#18181B] border border-[#2A2A2E] rounded-lg p-6 mb-4">
              <p className="text-[#F9FAFB] font-semibold mb-3">ARL is not:</p>
              <ul className="list-disc list-inside text-[#9CA3AF] space-y-2">
                <li><strong>A guarantee of agent performance.</strong> Reputation scores reflect historical outcomes as reported to the ledger. They do not promise future results.</li>
                <li><strong>A credit bureau or consumer reporting agency.</strong> ARL tracks agent outcomes, not human creditworthiness, and is not subject to FCRA or similar regulations.</li>
                <li><strong>A replacement for due diligence.</strong> Scores and badges should inform decisions, not replace independent evaluation of an agent's suitability for your use case.</li>
              </ul>
            </div>
          </section>

          {/* Accounts */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Accounts</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">Registration</h3>
            <p className="text-[#9CA3AF] mb-4">
              You must create an account to use ARL's dashboard and API. You agree to provide accurate information and keep it current.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Account Security</h3>
            <p className="text-[#9CA3AF] mb-4">
              You are responsible for maintaining the confidentiality of your login credentials and API keys. You are responsible for all activity that occurs under your account. If you suspect unauthorized access, notify us immediately at <a href="mailto:support@agentictrust.app" className="text-[#01696F] hover:underline">support@agentictrust.app</a> with the subject line "ARL: Security."
            </p>
          </section>

          {/* Your Data */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Your Data</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">What We Collect</h3>
            <p className="text-[#9CA3AF] mb-4">
              We collect the information you provide directly: account details, agent registrations, and outcome submissions. We also collect usage data (API calls, verification requests) to compute reputation scores and maintain audit trails.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">How We Use It</h3>
            <p className="text-[#9CA3AF] mb-4">
              Your data is used to operate the Service, compute reputation scores, generate verification badges, and improve the platform. We do not sell your data to third parties.
            </p>
          </section>

          {/* Reputation Scores */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Reputation Scores</h2>
            <p className="text-[#9CA3AF] mb-4">
              Reputation scores are computed from verified outcome data submitted to the ledger. Scores are algorithmically generated and may change as new outcomes are logged. ARL does not manually adjust scores except to correct verified errors.
            </p>
            <p className="text-[#9CA3AF] mb-4">
              You may contest a score by submitting a dispute through the dashboard or by contacting <a href="mailto:support@agentictrust.app" className="text-[#01696F] hover:underline">support@agentictrust.app</a>.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
            <p className="text-[#9CA3AF] mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-[#9CA3AF] space-y-2">
              <li>Submit false or misleading outcome data</li>
              <li>Attempt to manipulate reputation scores through fraudulent submissions</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to other users' accounts or data</li>
              <li>Reverse-engineer, decompile, or disassemble the Service</li>
            </ul>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Service Availability</h2>
            <p className="text-[#9CA3AF] mb-4">
              We strive for high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service at any time with reasonable notice.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
            <p className="text-[#9CA3AF] mb-4">
              To the maximum extent permitted by law, Agentic Trust is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of ARL, including but not limited to decisions made based on reputation scores.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to These Terms</h2>
            <p className="text-[#9CA3AF] mb-4">
              We may update these Terms from time to time. We will notify you of material changes by posting a notice on the Service or by email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-[#9CA3AF]">
              Questions about these Terms? Email us at <a href="mailto:support@agentictrust.app" className="text-[#01696F] hover:underline">support@agentictrust.app</a>.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}