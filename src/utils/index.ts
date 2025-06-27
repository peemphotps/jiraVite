import { format, parseISO } from "date-fns";
import type { JiraIssue, ColumnConfig, FilterOptions } from "../types";

// API Configuration
export const API_BASE_URL = "http://localhost:3000/api";
export const JIRA_BASE_URL = "https://linemanwongnai.atlassian.net";

// Default values
export const DEFAULT_JQL =
  "project = POSC AND Sprint = 5526 ORDER BY created DESC";
export const DEFAULT_BOARD_ID = 506;

// Status styling
export const getStatusBadgeClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    Open: "bg-gray-100 text-gray-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "In Review": "bg-yellow-100 text-yellow-800",
    "Review Done": "bg-purple-100 text-purple-800",
    "Ready to Test": "bg-orange-100 text-orange-800",
    Testing: "bg-indigo-100 text-indigo-800",
    "Test Done": "bg-green-100 text-green-800",
    "Regression Testing": "bg-red-100 text-red-800",
    Resolved: "bg-green-100 text-green-800",
  };

  return statusMap[status] || "bg-gray-100 text-gray-800";
};

// Priority styling
export const getPriorityBadgeClass = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    Highest: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-blue-100 text-blue-800",
    Lowest: "bg-gray-100 text-gray-800",
  };

  return priorityMap[priority] || "bg-gray-100 text-gray-800";
};

// Date formatting
export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), "MMM dd, yyyy");
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    return format(parseISO(dateString), "MMM dd, yyyy HH:mm");
  } catch {
    return dateString;
  }
};

// Local storage utilities
export const saveColumnWidths = (columns: ColumnConfig[]): void => {
  try {
    localStorage.setItem("jira-column-widths", JSON.stringify(columns));
  } catch (error) {
    console.warn("Failed to save column widths:", error);
  }
};

export const loadColumnWidths = (): ColumnConfig[] | null => {
  try {
    const saved = localStorage.getItem("jira-column-widths");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Failed to load column widths:", error);
    return null;
  }
};

// Issue filtering
export const filterIssues = (
  issues: JiraIssue[],
  filters: FilterOptions
): JiraIssue[] => {
  return issues.filter((issue) => {
    // Status filter
    if (filters.status && issue.status !== filters.status) {
      return false;
    }

    // Assignee filter
    if (filters.assignee && issue.assignee?.displayName !== filters.assignee) {
      return false;
    }

    // Search text filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matchesKey = issue.key.toLowerCase().includes(searchLower);
      const matchesSummary = issue.summary.toLowerCase().includes(searchLower);
      const matchesDescription = issue.description
        ?.toLowerCase()
        .includes(searchLower);

      if (!matchesKey && !matchesSummary && !matchesDescription) {
        return false;
      }
    }

    // Approval filter
    if (filters.approvalFilter && filters.approvalFilter !== "all") {
      switch (filters.approvalFilter) {
        case "pm":
          return issue.pmApprovalRequired;
        case "postCheck":
          return issue.postCheckApprovalRequired;
        case "testResult":
          return issue.testResultApprovalRequired;
        default:
          return true;
      }
    }

    return true;
  });
};

// Generate Jira URL
export const getJiraIssueUrl = (issueKey: string): string => {
  return `${JIRA_BASE_URL}/browse/${issueKey}`;
};

export const getJiraSprintUrl = (
  boardId: number,
  sprintId?: number
): string => {
  if (sprintId) {
    return `${JIRA_BASE_URL}/secure/RapidBoard.jspa?rapidView=${boardId}&view=planning&selectedSprint=${sprintId}`;
  }
  return `${JIRA_BASE_URL}/secure/RapidBoard.jspa?rapidView=${boardId}`;
};

// Error handling
export const getErrorMessage = (
  error:
    | Error
    | { response?: { data?: { message?: string } }; message?: string }
): string => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response?.data?.message
  ) {
    return error.response.data.message;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    error.message
  ) {
    return error.message;
  }
  return "An unexpected error occurred";
};
