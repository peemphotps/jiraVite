import React from "react";
import type { JiraIssue } from "../types";
import {
  getStatusBadgeClass,
  getPriorityBadgeClass,
  formatDate,
  getJiraIssueUrl,
} from "../utils";

interface TaskCardProps {
  issue: JiraIssue;
}

const TaskCard: React.FC<TaskCardProps> = ({ issue }) => {
  const handleKeyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getJiraIssueUrl(issue.key), "_blank");
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-5 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header with issue key and badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span
              className="text-sm font-bold text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1 rounded-lg border border-blue-400/20 hover:border-blue-400/40 cursor-pointer underline hover:no-underline transition-all duration-200"
              onClick={handleKeyClick}
            >
              {issue.key}
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${getStatusBadgeClass(
                  issue.status
                )} border border-green-400/30`}
              >
                {issue.status}
              </span>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${getPriorityBadgeClass(
                  issue.priority
                )} border border-orange-400/30`}
              >
                {issue.priority}
              </span>
            </div>
          </div>

          {/* Status indicator dot */}
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
        </div>

        {/* Title with better typography */}
        <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2 leading-relaxed group-hover:text-blue-300 transition-colors duration-200">
          {issue.summary}
        </h3>

        {/* Assignee and date section */}
        <div className="flex items-center justify-between text-sm mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
              {issue.assignee?.displayName
                ? issue.assignee.displayName.charAt(0).toUpperCase()
                : "U"}
            </div>
            <span className="text-gray-300 font-medium">
              {issue.assignee?.displayName || "Unassigned"}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">{formatDate(issue.created)}</span>
          </div>
        </div>

        {/* Approval Indicators with enhanced styling */}
        {(issue.pmApprovalRequired ||
          issue.postCheckApprovalRequired ||
          issue.testResultApprovalRequired) && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg
                className="w-4 h-4 text-amber-400"
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
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Approvals Required
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {issue.pmApprovalRequired && (
                <span className="px-3 py-1 bg-gradient-to-r from-orange-800 to-orange-700 text-orange-200 rounded-lg text-xs font-semibold border border-orange-600/50 shadow-sm">
                  PM Approval
                </span>
              )}
              {issue.postCheckApprovalRequired && (
                <span className="px-3 py-1 bg-gradient-to-r from-blue-800 to-blue-700 text-blue-200 rounded-lg text-xs font-semibold border border-blue-600/50 shadow-sm">
                  Post Check
                </span>
              )}
              {issue.testResultApprovalRequired && (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-800 to-purple-700 text-purple-200 rounded-lg text-xs font-semibold border border-purple-600/50 shadow-sm">
                  Test Result
                </span>
              )}
            </div>
          </div>
        )}

        {/* Labels with improved design */}
        {issue.labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Labels
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {issue.labels.slice(0, 3).map((label, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 rounded-lg text-xs font-medium border border-gray-500/50 shadow-sm hover:from-gray-600 hover:to-gray-500 transition-all duration-200"
                >
                  {label}
                </span>
              ))}
              {issue.labels.length > 3 && (
                <span className="px-3 py-1 bg-gradient-to-r from-indigo-800 to-indigo-700 text-indigo-200 rounded-lg text-xs font-semibold border border-indigo-600/50 shadow-sm">
                  +{issue.labels.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
