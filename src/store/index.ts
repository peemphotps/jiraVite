import { create } from "zustand";
import type { JiraIssue, Sprint, FilterOptions, ColumnConfig } from "../types";

interface JiraStore {
  // Issues
  issues: JiraIssue[];
  loading: boolean;
  error: string | null;

  // Sprints
  sprints: Sprint[];
  sprintsLoading: boolean;
  sprintsError: string | null;

  // Filters
  currentJQL: string;
  filters: FilterOptions;

  // UI State
  currentView: "dashboard" | "sprints";
  columns: ColumnConfig[];

  // Actions
  setIssues: (issues: JiraIssue[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setSprints: (sprints: Sprint[]) => void;
  setSprintsLoading: (loading: boolean) => void;
  setSprintsError: (error: string | null) => void;

  setCurrentJQL: (jql: string) => void;
  setFilters: (filters: FilterOptions) => void;
  setCurrentView: (view: "dashboard" | "sprints") => void;

  updateColumnWidth: (key: string, width: number) => void;
  toggleColumnVisibility: (key: string) => void;

  // Enhanced issues with approval flags
  getEnhancedIssues: () => JiraIssue[];

  // Status priority order
  getStatusPriority: (status: string) => number;
}

const STATUS_ORDER: Record<string, number> = {
  Resolved: 1,
  "Regression Testing": 2,
  "Test Done": 3,
  Testing: 4,
  "Ready to Test": 5,
  "Review Done": 6,
  "In Review": 7,
  "In Progress": 8,
  Open: 9,
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "key", label: "Key", width: 120, visible: true, sortable: true },
  {
    key: "summary",
    label: "Summary",
    width: 300,
    visible: true,
    sortable: true,
  },
  { key: "status", label: "Status", width: 150, visible: true, sortable: true },
  {
    key: "priority",
    label: "Priority",
    width: 100,
    visible: true,
    sortable: true,
  },
  {
    key: "assignee",
    label: "Assignee",
    width: 150,
    visible: true,
    sortable: true,
  },
  {
    key: "created",
    label: "Created",
    width: 120,
    visible: true,
    sortable: true,
  },
  {
    key: "labels",
    label: "Labels",
    width: 200,
    visible: true,
    sortable: false,
  },
];

export const useJiraStore = create<JiraStore>((set, get) => ({
  // Initial state
  issues: [],
  loading: false,
  error: null,

  sprints: [],
  sprintsLoading: false,
  sprintsError: null,

  currentJQL: "project = POSC AND Sprint = 5526 ORDER BY created DESC",
  filters: {},

  currentView: "dashboard",
  columns: DEFAULT_COLUMNS,

  // Actions
  setIssues: (issues) => set({ issues }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setSprints: (sprints) => set({ sprints }),
  setSprintsLoading: (sprintsLoading) => set({ sprintsLoading }),
  setSprintsError: (sprintsError) => set({ sprintsError }),

  setCurrentJQL: (currentJQL) => set({ currentJQL }),
  setFilters: (filters) => set({ filters }),
  setCurrentView: (currentView) => set({ currentView }),

  updateColumnWidth: (key, width) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.key === key ? { ...col, width } : col
      ),
    })),

  toggleColumnVisibility: (key) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      ),
    })),

  getEnhancedIssues: () => {
    const { issues } = get();
    return issues.map((issue) => ({
      ...issue,
      pmApprovalRequired:
        (issue.issueType === "Production Bug" || issue.issueType === "Story") &&
        !issue.labels.includes("pm_approved"),
      postCheckApprovalRequired:
        (issue.status === "Resolved" || issue.status === "Testing") &&
        !issue.labels.includes("post_check_approved"),
      testResultApprovalRequired:
        (issue.status === "Resolved" || issue.status === "Testing") &&
        !issue.labels.includes("test_result_approved"),
    }));
  },

  getStatusPriority: (status) => STATUS_ORDER[status] || 999,
}));
