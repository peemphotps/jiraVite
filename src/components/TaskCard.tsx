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
  const openInJira = () => {
    window.open(getJiraIssueUrl(issue.key), "_blank");
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={openInJira}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-600">{issue.key}</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
              issue.status
            )}`}
          >
            {issue.status}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(
              issue.priority
            )}`}
          >
            {issue.priority}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
        {issue.summary}
      </h3>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>{issue.assignee?.displayName || "Unassigned"}</span>
        <span>{formatDate(issue.created)}</span>
      </div>

      {/* Approval Indicators */}
      <div className="flex flex-wrap gap-1 mb-2">
        {issue.pmApprovalRequired && (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
            PM Approval Required
          </span>
        )}
        {issue.postCheckApprovalRequired && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Post Check Required
          </span>
        )}
        {issue.testResultApprovalRequired && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            Test Result Required
          </span>
        )}
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((label, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {label}
            </span>
          ))}
          {issue.labels.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              +{issue.labels.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
