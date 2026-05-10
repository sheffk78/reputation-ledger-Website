import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050709] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-[80px] font-bold font-heading text-[#01696F]/30 leading-none mb-4">
          404
        </div>
        <h1 className="text-2xl font-semibold text-white mb-3">
          Page not found
        </h1>
        <p className="text-[#9CA3AF] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="px-5 py-2.5 bg-[#01696F] hover:bg-[#028C94] text-white font-medium rounded-lg transition-colors"
          >
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 bg-transparent border border-[#1F2933] hover:border-[#9CA3AF] text-[#9CA3AF] hover:text-white font-medium rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}