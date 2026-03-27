import { Link } from "react-router-dom";
import { FlaskConical, ArrowLeft } from "lucide-react";

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#01696F] to-[#014F52] rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white font-['Space_Grotesk']">
              API Playground
            </span>
          </div>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#01696F]/10 rounded-2xl flex items-center justify-center">
            <FlaskConical className="w-10 h-10 text-[#01696F]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3 font-['Space_Grotesk']">
            API Playground
          </h1>
          <p className="text-gray-400 mb-6">
            Interactive API testing is coming soon. You'll be able to test endpoints 
            with your real API key and see live responses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/docs"
              className="px-5 py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors"
            >
              View API Docs
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-white font-medium rounded-lg transition-colors border border-white/[0.08]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
