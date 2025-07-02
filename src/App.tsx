import React, { useState } from "react";
import Board from "./components/Board";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "sprints">(
    "dashboard"
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Jira Integration Platform
          </h1>
          <nav className="flex space-x-4">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === "dashboard"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📊 Jira Issues Dashboard
            </button>
            <button
              onClick={() => setCurrentView("sprints")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === "sprints"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🏃‍♂️ Sprint Search
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto">
          {currentView === "dashboard" ? (
            <Board onNavigateToSprints={() => setCurrentView("sprints")} />
          ) : (
            <Dashboard
              onNavigateToDashboard={() => setCurrentView("dashboard")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
