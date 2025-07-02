export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  reporter: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
  labels: string[];
  issueType: string;
  description?: string;
  sprint?: {
    id: number;
    name: string;
    state?: string;
  };
  // Approval flags
  pmApprovalRequired?: boolean;
  postCheckApprovalRequired?: boolean;
  testResultApprovalRequired?: boolean;
}

export interface Sprint {
  id: number;
  name: string;
  state: "closed" | "active" | "future";
  boardId: number;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
}

export interface Board {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId?: number;
    projectKey?: string;
    projectName?: string;
  };
}

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export type IssueStatus =
  | "Resolved"
  | "Regression Testing"
  | "Test Done"
  | "Testing"
  | "Ready to Test"
  | "Review Done"
  | "In Review"
  | "In Progress"
  | "Open";

export interface FilterOptions {
  status?: string;
  assignee?: string;
  sprint?: string;
  approvalFilter?: "pm" | "postCheck" | "testResult" | "all";
  searchText?: string;
  groupFilter?:
    | "resolve"
    | "regression-done"
    | "test-done"
    | "testing"
    | "ready-to-test"
    | "review-done"
    | "in-review"
    | "in-progress"
    | "all";
}

export interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  sortable: boolean;
}
