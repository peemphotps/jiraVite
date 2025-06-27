import React from "react";
import { useJiraStore } from "../store";

const Header: React.FC = () => {
  const { currentView, setCurrentView } = useJiraStore();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Jira Integration Dashboard
            </h1>
          </div>

          <nav className="flex space-x-1">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === "dashboard"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Issues Dashboard
            </button>
            <button
              onClick={() => setCurrentView("sprints")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === "sprints"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Sprints Search
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
