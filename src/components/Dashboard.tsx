import React, { useState } from "react";
import { useJiraStore } from "../store";
import { formatDate, getJiraSprintUrl, DEFAULT_BOARD_ID } from "../utils";
import type { Sprint } from "../types";
import axios from "axios";

const Dashboard: React.FC = () => {
  const {
    sprints,
    sprintsLoading,
    sprintsError,
    setSprints,
    setSprintsLoading,
    setSprintsError,
  } = useJiraStore();

  const [boardId, setBoardId] = useState(DEFAULT_BOARD_ID.toString());
  const [sprintName, setSprintName] = useState("");

  const fetchSprints = async () => {
    if (!boardId) {
      setSprintsError("Board ID is required");
      return;
    }

    setSprintsLoading(true);
    setSprintsError(null);

    try {
      const params: { boardId: string; sprintName?: string } = { boardId };
      if (sprintName.trim()) {
        params.sprintName = sprintName.trim();
      }

      const response = await axios.get(
        "http://localhost:3000/api/jira-sprints",
        {
          params,
        }
      );

      // Transform API response to match our interface
      interface JiraApiSprint {
        id: number;
        name: string;
        state: "closed" | "active" | "future";
        startDate?: string;
        endDate?: string;
        completeDate?: string;
        goal?: string;
      }

      const transformedSprints =
        response.data.values?.map((sprint: JiraApiSprint) => ({
          id: sprint.id,
          name: sprint.name,
          state: sprint.state,
          boardId: parseInt(boardId),
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          completeDate: sprint.completeDate,
          goal: sprint.goal,
        })) || [];

      // Sort by Sprint ID (newest first)
      transformedSprints.sort((a: Sprint, b: Sprint) => b.id - a.id);

      setSprints(transformedSprints);
    } catch (err) {
      console.error("Failed to fetch sprints:", err);
      setSprintsError(
        "Failed to fetch sprints. Please check your connection and try again."
      );
    } finally {
      setSprintsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSprints();
  };

  const openSprintInJira = (sprintId: number) => {
    window.open(getJiraSprintUrl(parseInt(boardId), sprintId), "_blank");
  };

  const getStateBadgeClass = (state: string): string => {
    switch (state) {
      case "active":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "future":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sprints Search
          </h1>
          <p className="text-gray-600">Search and browse sprints by board ID</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-4 items-end"
          >
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter board ID (e.g., 506)"
                required
              />
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Name (Optional)
              </label>
              <input
                type="text"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Filter by sprint name"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={sprintsLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sprintsLoading ? "Searching..." : "Search Sprints"}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {sprintsLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sprints...</p>
          </div>
        )}

        {/* Error State */}
        {sprintsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="text-red-500 mr-3">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-800">
                  Error Loading Sprints
                </h3>
                <p className="text-red-700">{sprintsError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!sprintsLoading && !sprintsError && sprints.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Found {sprints.length} sprint{sprints.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openSprintInJira(sprint.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {sprint.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStateBadgeClass(
                            sprint.state
                          )}`}
                        >
                          {sprint.state.charAt(0).toUpperCase() +
                            sprint.state.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-medium">
                          Sprint ID: {sprint.id}
                        </span>
                        {sprint.startDate && (
                          <span>Start: {formatDate(sprint.startDate)}</span>
                        )}
                        {sprint.endDate && (
                          <span>End: {formatDate(sprint.endDate)}</span>
                        )}
                        {sprint.completeDate && (
                          <span>
                            Completed: {formatDate(sprint.completeDate)}
                          </span>
                        )}
                      </div>

                      {sprint.goal && (
                        <p className="text-gray-700 mt-2">{sprint.goal}</p>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSprintInJira(sprint.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View in Jira →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!sprintsLoading &&
          !sprintsError &&
          sprints.length === 0 &&
          boardId && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Sprints Found
              </h3>
              <p className="text-gray-600">
                Try searching with a different board ID or sprint name.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
