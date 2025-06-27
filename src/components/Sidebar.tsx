import React, { useState } from "react";
import { useJiraStore } from "../store";

const Sidebar: React.FC = () => {
  const {
    currentJQL,
    setCurrentJQL,
    filters,
    setFilters,
    issues,
    getEnhancedIssues,
  } = useJiraStore();

  const [localJQL, setLocalJQL] = useState(currentJQL);
  const enhancedIssues = getEnhancedIssues();

  // Get unique values for filters
  const uniqueStatuses = [
    ...new Set(issues.map((issue) => issue.status)),
  ].sort();
  const uniqueAssignees = [
    ...new Set(
      issues.map((issue) => issue.assignee?.displayName).filter(Boolean)
    ),
  ].sort();

  const handleJQLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentJQL(localJQL);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({
      ...filters,
      [key]: value === "" ? undefined : value,
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="w-80 bg-white shadow-lg border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Search & Filters
        </h2>

        {/* JQL Query */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            JQL Query
          </label>
          <form onSubmit={handleJQLSubmit}>
            <textarea
              value={localJQL}
              onChange={(e) => setLocalJQL(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter JQL query..."
            />
            <button
              type="submit"
              className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search Issues
            </button>
          </form>
        </div>

        {/* Quick Filters */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Quick Filters
          </h3>

          {/* Text Search */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Text Search
            </label>
            <input
              type="text"
              value={filters.searchText || ""}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search key, summary, description..."
            />
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Assignee
            </label>
            <select
              value={filters.assignee || ""}
              onChange={(e) => handleFilterChange("assignee", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Assignees</option>
              {uniqueAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Approval Status
            </label>
            <select
              value={filters.approvalFilter || "all"}
              onChange={(e) =>
                handleFilterChange("approvalFilter", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Issues</option>
              <option value="pm">PM Approval Required</option>
              <option value="postCheck">Post Check Required</option>
              <option value="testResult">Test Result Required</option>
            </select>
          </div>

          <button
            onClick={clearFilters}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>

        {/* Summary Stats */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Summary</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Issues:</span>
              <span className="font-medium">{issues.length}</span>
            </div>
            <div className="flex justify-between">
              <span>PM Approval Required:</span>
              <span className="font-medium text-orange-600">
                {enhancedIssues.filter((i) => i.pmApprovalRequired).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Post Check Required:</span>
              <span className="font-medium text-blue-600">
                {
                  enhancedIssues.filter((i) => i.postCheckApprovalRequired)
                    .length
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Test Result Required:</span>
              <span className="font-medium text-purple-600">
                {
                  enhancedIssues.filter((i) => i.testResultApprovalRequired)
                    .length
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
