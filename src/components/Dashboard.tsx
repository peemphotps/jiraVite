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
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [jiraStatusFilter, setJiraStatusFilter] = useState("all");

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

      // Apply filters
      let filteredSprints = transformedSprints;

      // Apply approval filter (this is a conceptual filter - you'd need to implement based on your sprint data)
      if (approvalFilter !== "all") {
        // Note: This is a placeholder - you'd need to implement based on your actual sprint approval logic
        filteredSprints = filteredSprints.filter((sprint: Sprint) => {
          switch (approvalFilter) {
            case "pm":
              return (
                sprint.name.toLowerCase().includes("pm") ||
                sprint.goal?.toLowerCase().includes("pm")
              );
            case "postCheck":
              return (
                sprint.name.toLowerCase().includes("post") ||
                sprint.goal?.toLowerCase().includes("post")
              );
            case "testResult":
              return (
                sprint.name.toLowerCase().includes("test") ||
                sprint.goal?.toLowerCase().includes("test")
              );
            case "multiple":
              return (
                sprint.name.toLowerCase().includes("multiple") ||
                sprint.goal?.toLowerCase().includes("multiple")
              );
            default:
              return true;
          }
        });
      }

      // Apply group filter
      if (groupFilter !== "all") {
        filteredSprints = filteredSprints.filter((sprint: Sprint) => {
          const sprintNameLower = sprint.name.toLowerCase();
          const goalLower = sprint.goal?.toLowerCase() || "";

          switch (groupFilter) {
            case "resolve":
              return (
                sprintNameLower.includes("resolve") ||
                goalLower.includes("resolve")
              );
            case "regression-done":
              return (
                sprintNameLower.includes("regression") ||
                goalLower.includes("regression")
              );
            case "test-done":
              return (
                sprintNameLower.includes("test done") ||
                goalLower.includes("test done")
              );
            case "testing":
              return (
                sprintNameLower.includes("testing") ||
                goalLower.includes("testing")
              );
            case "ready-to-test":
              return (
                sprintNameLower.includes("ready to test") ||
                goalLower.includes("ready to test")
              );
            case "review-done":
              return (
                sprintNameLower.includes("review done") ||
                goalLower.includes("review done")
              );
            case "in-review":
              return (
                sprintNameLower.includes("in review") ||
                goalLower.includes("in review")
              );
            case "in-progress":
              return (
                sprintNameLower.includes("in progress") ||
                sprintNameLower.includes("in-progress") ||
                goalLower.includes("in progress")
              );
            default:
              return true;
          }
        });
      }

      // Apply Jira status filter
      if (jiraStatusFilter !== "all") {
        filteredSprints = filteredSprints.filter((sprint: Sprint) => {
          return sprint.state === jiraStatusFilter;
        });
      }

      setSprints(filteredSprints);
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
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Sprints Search
          </h1>
          <p className="text-gray-600">Search and browse sprints by board ID</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-6 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-6 items-end"
          >
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Board ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                placeholder="Enter board ID (e.g., 506)"
                required
              />
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Sprint Name (Optional)
              </label>
              <input
                type="text"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                placeholder="Filter by sprint name"
              />
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Filter by Approval Needs
              </label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              >
                <option value="all">All Sprints</option>
                <option value="pm">PM Approval Required</option>
                <option value="postCheck">Post Check Required</option>
                <option value="testResult">Test Result Required</option>
                <option value="multiple">Multiple Approvals Needed</option>
              </select>
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Filter by Group
              </label>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              >
                <option value="all">All Groups</option>
                <option value="resolve">Resolve</option>
                <option value="regression-done">Regression Done</option>
                <option value="test-done">Test Done</option>
                <option value="testing">Testing</option>
                <option value="ready-to-test">Ready to Test</option>
                <option value="review-done">Review Done</option>
                <option value="in-review">In Review</option>
                <option value="in-progress">In Progress</option>
              </select>
            </div>

            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Filter by Jira Status
              </label>
              <select
                value={jiraStatusFilter}
                onChange={(e) => setJiraStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="future">Future</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={sprintsLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {sprintsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>Search Sprints</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {sprintsLoading && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto border border-gray-100">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <p className="text-gray-600 font-medium text-lg">
                Loading sprints...
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Please wait while we fetch your data
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {sprintsError && (
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 mb-6">
            <div className="flex items-center">
              <div className="bg-red-100 rounded-full p-3 mr-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  Error Loading Sprints
                </h3>
                <p className="text-red-700">{sprintsError}</p>
                <button
                  onClick={fetchSprints}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {!sprintsLoading && !sprintsError && sprints.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            {/* Table Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Found {sprints.length} sprint{sprints.length !== 1 ? "s" : ""}{" "}
                  for Board {boardId}
                </h2>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                  Click any row to open in Jira
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Sprint Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sprints.map((sprint, index) => (
                    <tr
                      key={sprint.id}
                      className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                      onClick={() => openSprintInJira(sprint.id)}
                    >
                      {/* Sprint Details */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <div className="text-sm font-semibold text-gray-900 mb-1">
                            {sprint.name}
                          </div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block w-fit">
                            ID: {sprint.id} • Board: {sprint.boardId}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStateBadgeClass(
                            sprint.state
                          )}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              sprint.state === "active"
                                ? "bg-green-500 animate-pulse"
                                : sprint.state === "closed"
                                ? "bg-gray-500"
                                : "bg-blue-500"
                            }`}
                          ></div>
                          {sprint.state.charAt(0).toUpperCase() +
                            sprint.state.slice(1)}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 space-y-1.5">
                          {sprint.startDate && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 w-12 font-medium">
                                Start:
                              </span>
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                                {formatDate(sprint.startDate)}
                              </span>
                            </div>
                          )}
                          {sprint.endDate && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 w-12 font-medium">
                                End:
                              </span>
                              <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs">
                                {formatDate(sprint.endDate)}
                              </span>
                            </div>
                          )}
                          {sprint.completeDate && (
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 w-12 font-medium">
                                Done:
                              </span>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                                {formatDate(sprint.completeDate)}
                              </span>
                            </div>
                          )}
                          {!sprint.startDate &&
                            !sprint.endDate &&
                            !sprint.completeDate && (
                              <span className="text-xs text-gray-400 italic">
                                No dates set
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Goal */}
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {sprint.goal ? (
                            <div
                              className="line-clamp-2 bg-gray-50 p-2 rounded-md text-xs"
                              title={sprint.goal}
                            >
                              {sprint.goal}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              No goal set
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSprintInJira(sprint.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold hover:underline bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-all duration-200"
                          >
                            Open in Jira
                          </button>
                          <div className="text-gray-300">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="font-medium">
                  Showing {sprints.length} sprint
                  {sprints.length !== 1 ? "s" : ""}
                  {sprintName && ` matching "${sprintName}"`}
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-medium">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="font-medium">Closed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Future</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!sprintsLoading &&
          !sprintsError &&
          sprints.length === 0 &&
          boardId && (
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto border border-gray-100">
                <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
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
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  No Sprints Found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try searching with a different board ID or sprint name.
                </p>
                <button
                  onClick={() => {
                    setBoardId(DEFAULT_BOARD_ID.toString());
                    setSprintName("");
                    setApprovalFilter("all");
                    setGroupFilter("all");
                    setJiraStatusFilter("all");
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
