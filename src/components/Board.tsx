import React, { useEffect, useMemo, useCallback } from "react";
import { useJiraStore } from "../store";
import { filterIssues } from "../utils";
import KanbanColumn from "./KanbanColumn";
import type { IssueStatus, JiraIssue } from "../types";
import axios from "axios";

const STATUS_ORDER: IssueStatus[] = [
  "Resolved",
  "Regression Testing",
  "Test Done",
  "Testing",
  "Ready to Test",
  "Review Done",
  "In Review",
  "In Progress",
  "Open",
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-gray-100",
  "In Progress": "bg-blue-100",
  "In Review": "bg-yellow-100",
  "Review Done": "bg-purple-100",
  "Ready to Test": "bg-orange-100",
  Testing: "bg-indigo-100",
  "Test Done": "bg-green-100",
  "Regression Testing": "bg-red-100",
  Resolved: "bg-green-100",
};

const Board: React.FC = () => {
  const {
    issues,
    loading,
    error,
    filters,
    currentJQL,
    setIssues,
    setLoading,
    setError,
    getEnhancedIssues,
    getStatusPriority,
  } = useJiraStore();

  // Fetch issues from API
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        "http://localhost:3000/api/jira-issues",
        {
          params: { jql: currentJQL },
        }
      );

      // Transform API response to match our interface
      interface JiraApiIssue {
        id: string;
        key: string;
        fields: {
          summary?: string;
          status?: { name: string };
          priority?: { name: string };
          assignee?: {
            displayName: string;
            emailAddress: string;
          };
          reporter?: {
            displayName: string;
            emailAddress: string;
          };
          created?: string;
          updated?: string;
          labels?: string[];
          issuetype?: { name: string };
          description?: string;
        };
      }

      const transformedIssues =
        response.data.issues?.map((issue: JiraApiIssue) => ({
          id: issue.id,
          key: issue.key,
          summary: issue.fields?.summary || "",
          status: issue.fields?.status?.name || "",
          priority: issue.fields?.priority?.name || "",
          assignee: issue.fields?.assignee
            ? {
                displayName: issue.fields.assignee.displayName,
                emailAddress: issue.fields.assignee.emailAddress,
              }
            : undefined,
          reporter: {
            displayName: issue.fields?.reporter?.displayName || "",
            emailAddress: issue.fields?.reporter?.emailAddress || "",
          },
          created: issue.fields?.created || "",
          updated: issue.fields?.updated || "",
          labels: issue.fields?.labels || [],
          issueType: issue.fields?.issuetype?.name || "",
          description: issue.fields?.description || "",
        })) || [];

      setIssues(transformedIssues);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
      setError(
        "Failed to fetch issues. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [currentJQL, setIssues, setLoading, setError]);

  // Fetch issues when JQL changes
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Get enhanced issues with approval flags
  const enhancedIssues = getEnhancedIssues();

  // Filter and group issues by status
  const filteredIssues = useMemo(() => {
    return filterIssues(enhancedIssues, filters);
  }, [enhancedIssues, filters]);

  const groupedIssues = useMemo(() => {
    const groups: Record<string, JiraIssue[]> = {};

    // Initialize all status groups
    STATUS_ORDER.forEach((status) => {
      groups[status] = [];
    });

    // Group issues by status
    filteredIssues.forEach((issue) => {
      if (groups[issue.status]) {
        groups[issue.status].push(issue);
      } else {
        // Handle unknown statuses
        if (!groups["Other"]) {
          groups["Other"] = [];
        }
        groups["Other"].push(issue);
      }
    });

    // Sort issues within each group by priority and created date
    Object.keys(groups).forEach((status) => {
      groups[status].sort((a, b) => {
        // First by status priority
        const statusPriorityA = getStatusPriority(a.status);
        const statusPriorityB = getStatusPriority(b.status);
        if (statusPriorityA !== statusPriorityB) {
          return statusPriorityA - statusPriorityB;
        }

        // Then by created date (newest first)
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
    });

    return groups;
  }, [filteredIssues, getStatusPriority]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Issues
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchIssues}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Issues Dashboard
        </h1>
        <p className="text-gray-600">
          Showing {filteredIssues.length} of {issues.length} issues
        </p>
      </div>

      <div className="flex space-x-6 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const statusIssues = groupedIssues[status] || [];
          return (
            <KanbanColumn
              key={status}
              title={status}
              issues={statusIssues}
              statusColor={STATUS_COLORS[status]}
            />
          );
        })}

        {/* Show "Other" column if there are issues with unknown statuses */}
        {groupedIssues["Other"] && groupedIssues["Other"].length > 0 && (
          <KanbanColumn
            title="Other"
            issues={groupedIssues["Other"]}
            statusColor="bg-gray-100"
          />
        )}
      </div>
    </div>
  );
};

export default Board;
