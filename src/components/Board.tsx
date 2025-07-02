import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useJiraStore } from "../store";
import { filterIssues, formatDate, getJiraIssueUrl } from "../utils";
import type { JiraIssue } from "../types";
import axios from "axios";

interface BoardProps {
  onNavigateToSprints?: () => void;
}

const Board: React.FC<BoardProps> = ({ onNavigateToSprints }) => {
  const {
    loading,
    error,
    filters,
    currentJQL,
    setCurrentJQL,
    setIssues,
    setLoading,
    setError,
    getEnhancedIssues,
  } = useJiraStore();

  const [localJQL, setLocalJQL] = useState(currentJQL);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [remarkFilters, setRemarkFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);

  // State for multi-select dropdowns
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedSprints, setSelectedSprints] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // State for sprint search
  const [boardId, setBoardId] = useState<string>("506");
  const [sprintSearchResults, setSprintSearchResults] = useState<
    Array<{
      id: number;
      name: string;
      state: string;
    }>
  >([]);
  const [sprintSearchLoading, setSprintSearchLoading] =
    useState<boolean>(false);
  const [sprintSearchError, setSprintSearchError] = useState<string | null>(
    null
  );

  // State for generated task list
  const [showTaskList, setShowTaskList] = useState<boolean>(false);
  const [generatedTaskList, setGeneratedTaskList] = useState<string>("");
  const [taskListItems, setTaskListItems] = useState<
    Array<{ id: string; text: string; selected: boolean }>
  >([]);
  const [selectAll, setSelectAll] = useState<boolean>(true);

  // State for format field selection
  const [formatFields, setFormatFields] = useState({
    key: true,
    status: true,
    assignee: true,
    summary: true,
    remarks: true,
    priority: false,
    sprint: false,
    issueType: false,
    created: false,
    updated: false,
  });

  // State for collapsible sections - default to hidden
  const [showSelectAllSection, setShowSelectAllSection] =
    useState<boolean>(false);

  // State for toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
  }>({ message: "", type: "info", visible: false });

  // Toast utility functions
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type, visible: true });
      setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
    },
    []
  );

  // Toggle remark filter
  const toggleRemarkFilter = (remark: string) => {
    setRemarkFilters((prev) => {
      if (prev.includes(remark)) {
        return prev.filter((r) => r !== remark);
      } else {
        return [...prev, remark];
      }
    });
  };

  // Clear all remark filters
  const clearRemarkFilters = () => {
    setRemarkFilters([]);
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Clear all status filters
  const clearStatusFilters = () => {
    setStatusFilters([]);
  };

  // Toggle assignee filter
  const toggleAssigneeFilter = (assignee: string) => {
    setAssigneeFilters((prev) => {
      if (prev.includes(assignee)) {
        return prev.filter((a) => a !== assignee);
      } else {
        return [...prev, assignee];
      }
    });
  };

  // Clear all assignee filters
  const clearAssigneeFilters = () => {
    setAssigneeFilters([]);
  };

  // Clear all advanced filters
  const clearAllAdvancedFilters = () => {
    setRemarkFilters([]);
    setStatusFilters([]);
    setAssigneeFilters([]);
  };

  // Generate task list for copying
  const generateTaskList = () => {
    // Sort filtered issues by assignee
    const sortedIssues = [...filteredIssues].sort((a, b) => {
      const assigneeA = a.assignee?.displayName || "Unassigned";
      const assigneeB = b.assignee?.displayName || "Unassigned";
      return assigneeA.localeCompare(assigneeB);
    });

    const taskItems = sortedIssues.map((issue) => {
      // Generate remarks
      const labels = issue.labels || [];
      const issueType = issue.issueType?.toLowerCase();
      const hasTestResultApproved = labels.includes("TEST_RESULT_APPROVED");
      const hasPostCheckApproved = labels.includes("POST_CHECK_APPROVED");
      const hasPmApprove = labels.includes("PM_APPROVE");
      const needsPmApproval =
        (issueType === "story" || issueType === "production bug") &&
        !hasPmApprove;

      const remarks = [];
      if (needsPmApproval) remarks.push("Need PM Approve");
      if (!hasPostCheckApproved) remarks.push("Need Post check");
      if (!hasTestResultApproved) remarks.push("Need test result");

      const remarksText =
        remarks.length > 0 ? remarks.join(", ") : "No remarks";
      const assigneeText = issue.assignee?.displayName || "Unassigned";

      // Build task text based on selected fields
      const fields = [];
      if (formatFields.key) fields.push(getJiraIssueUrl(issue.key));
      if (formatFields.status) fields.push(issue.status);
      if (formatFields.assignee) fields.push(assigneeText);
      if (formatFields.summary) fields.push(issue.summary);
      if (formatFields.remarks) fields.push(remarksText);
      if (formatFields.priority) fields.push(issue.priority);
      if (formatFields.sprint) fields.push(issue.sprint?.name || "No Sprint");
      if (formatFields.issueType) fields.push(issue.issueType);
      if (formatFields.created) fields.push(formatDate(issue.created));
      if (formatFields.updated) fields.push(formatDate(issue.updated));

      const taskText = fields.join(", ");

      return {
        id: issue.key,
        text: taskText,
        selected: true,
      };
    });

    setTaskListItems(taskItems);
    setSelectAll(true);
    setShowSelectAllSection(false); // Ensure Selection Controls starts hidden

    // Generate the initial text with all items selected
    const taskListText = taskItems.map((item) => item.text).join("\n");
    setGeneratedTaskList(taskListText);
    setShowTaskList(true);
  };

  // Copy task list to clipboard
  const copyTaskList = async () => {
    try {
      await navigator.clipboard.writeText(generatedTaskList);
      showToast("Task list copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("Failed to copy to clipboard", "error");
    }
  };

  // Handle select all/none for task list
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    const updatedItems = taskListItems.map((item) => ({
      ...item,
      selected: checked,
    }));
    setTaskListItems(updatedItems);

    // Update the generated text
    const selectedText = checked
      ? updatedItems.map((item) => item.text).join("\n")
      : "";
    setGeneratedTaskList(selectedText);
  };

  // Handle individual task selection
  const handleTaskSelection = (taskId: string, selected: boolean) => {
    const updatedItems = taskListItems.map((item) =>
      item.id === taskId ? { ...item, selected } : item
    );
    setTaskListItems(updatedItems);

    // Update select all state
    const allSelected = updatedItems.every((item) => item.selected);
    setSelectAll(allSelected);

    // Update the generated text with only selected items
    const selectedText = updatedItems
      .filter((item) => item.selected)
      .map((item) => item.text)
      .join("\n");
    setGeneratedTaskList(selectedText);
  };

  // Handle format field toggle
  const handleFormatFieldToggle = (fieldName: keyof typeof formatFields) => {
    const updatedFields = {
      ...formatFields,
      [fieldName]: !formatFields[fieldName],
    };
    setFormatFields(updatedFields);

    // Regenerate task list with new format
    regenerateTaskListWithFormat(updatedFields);
  };

  // Get format display string
  const getFormatString = () => {
    const fields = [];
    if (formatFields.key) fields.push("Key(with link)");
    if (formatFields.status) fields.push("Status");
    if (formatFields.assignee) fields.push("Assignee");
    if (formatFields.summary) fields.push("Summary");
    if (formatFields.remarks) fields.push("Remarks");
    if (formatFields.priority) fields.push("Priority");
    if (formatFields.sprint) fields.push("Sprint");
    if (formatFields.issueType) fields.push("Issue Type");
    if (formatFields.created) fields.push("Created");
    if (formatFields.updated) fields.push("Updated");

    return fields.join(", ");
  };

  // Regenerate task list with new format
  const regenerateTaskListWithFormat = (fields: typeof formatFields) => {
    if (taskListItems.length === 0) return;

    // Sort filtered issues by assignee
    const sortedIssues = [...filteredIssues].sort((a, b) => {
      const assigneeA = a.assignee?.displayName || "Unassigned";
      const assigneeB = b.assignee?.displayName || "Unassigned";
      return assigneeA.localeCompare(assigneeB);
    });

    const updatedTaskItems = sortedIssues.map((issue) => {
      // Generate remarks
      const labels = issue.labels || [];
      const issueType = issue.issueType?.toLowerCase();
      const hasTestResultApproved = labels.includes("TEST_RESULT_APPROVED");
      const hasPostCheckApproved = labels.includes("POST_CHECK_APPROVED");
      const hasPmApprove = labels.includes("PM_APPROVE");
      const needsPmApproval =
        (issueType === "story" || issueType === "production bug") &&
        !hasPmApprove;

      const remarks = [];
      if (needsPmApproval) remarks.push("Need PM Approve");
      if (!hasPostCheckApproved) remarks.push("Need Post check");
      if (!hasTestResultApproved) remarks.push("Need test result");

      const remarksText =
        remarks.length > 0 ? remarks.join(", ") : "No remarks";
      const assigneeText = issue.assignee?.displayName || "Unassigned";

      // Build task text based on selected fields
      const fieldValues = [];
      if (fields.key) fieldValues.push(getJiraIssueUrl(issue.key));
      if (fields.status) fieldValues.push(issue.status);
      if (fields.assignee) fieldValues.push(assigneeText);
      if (fields.summary) fieldValues.push(issue.summary);
      if (fields.remarks) fieldValues.push(remarksText);
      if (fields.priority) fieldValues.push(issue.priority);
      if (fields.sprint) fieldValues.push(issue.sprint?.name || "No Sprint");
      if (fields.issueType) fieldValues.push(issue.issueType);
      if (fields.created) fieldValues.push(formatDate(issue.created));
      if (fields.updated) fieldValues.push(formatDate(issue.updated));

      const taskText = fieldValues.join(", ");

      // Preserve existing selection state if item exists
      const existingItem = taskListItems.find((item) => item.id === issue.key);
      const isSelected = existingItem ? existingItem.selected : true;

      return {
        id: issue.key,
        text: taskText,
        selected: isSelected,
      };
    });

    setTaskListItems(updatedTaskItems);

    // Update the generated text with selected items
    const selectedText = updatedTaskItems
      .filter((item) => item.selected)
      .map((item) => item.text)
      .join("\n");
    setGeneratedTaskList(selectedText);
  };

  // Sprint search function
  const searchSprints = async (boardIdToSearch: string) => {
    if (!boardIdToSearch.trim()) {
      setSprintSearchError("Please enter a board ID");
      return;
    }

    setSprintSearchLoading(true);
    setSprintSearchError(null);
    setSprintSearchResults([]);

    try {
      const response = await axios.get(
        "http://localhost:3000/api/jira-sprints",
        {
          params: { boardId: boardIdToSearch },
        }
      );

      if (response.data && response.data.values) {
        // Sort sprints by state priority: active -> future -> closed
        const sortedSprints = response.data.values.sort(
          (
            a: { id: number; name: string; state: string },
            b: { id: number; name: string; state: string }
          ) => {
            const stateOrder = { active: 1, future: 2, closed: 3 };
            const aOrder = stateOrder[a.state as keyof typeof stateOrder] || 4;
            const bOrder = stateOrder[b.state as keyof typeof stateOrder] || 4;
            return aOrder - bOrder;
          }
        );
        setSprintSearchResults(sortedSprints);
      } else {
        setSprintSearchResults([]);
        setSprintSearchError("No sprints found for this board");
      }
    } catch (err) {
      console.error("Failed to fetch sprints:", err);
      setSprintSearchError(
        "Failed to fetch sprints. Please check the board ID and try again."
      );
      setSprintSearchResults([]);
    } finally {
      setSprintSearchLoading(false);
    }
  };

  // Sorting function
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  // Get sorted issues
  const getSortedIssues = useCallback(
    (issues: JiraIssue[]) => {
      if (!sortConfig) return issues;

      return [...issues].sort((a, b) => {
        const { key, direction } = sortConfig;

        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (key) {
          case "key":
            aValue = a.key;
            bValue = b.key;
            break;
          case "summary":
            aValue = a.summary;
            bValue = b.summary;
            break;
          case "status":
            // Use custom status order for better sorting
            aValue = getStatusSortOrder(a.status);
            bValue = getStatusSortOrder(b.status);
            break;
          case "type":
            aValue = a.issueType;
            bValue = b.issueType;
            break;
          case "assignee":
            aValue = a.assignee?.displayName || "";
            bValue = b.assignee?.displayName || "";
            break;
          case "priority": {
            // Use priority order for better sorting
            const priorityOrder = {
              Highest: 1,
              High: 2,
              Medium: 3,
              Low: 4,
              Lowest: 5,
            };
            aValue =
              priorityOrder[a.priority as keyof typeof priorityOrder] || 99;
            bValue =
              priorityOrder[b.priority as keyof typeof priorityOrder] || 99;
            break;
          }
          case "sprint":
            aValue = a.sprint?.name || "";
            bValue = b.sprint?.name || "";
            break;
          case "created":
            aValue = new Date(a.created);
            bValue = new Date(b.created);
            break;
          case "updated":
            aValue = new Date(a.updated);
            bValue = new Date(b.updated);
            break;
          default:
            aValue = "";
            bValue = "";
        }

        if (aValue < bValue) {
          return direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    },
    [sortConfig]
  );

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return "⇅";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  // Helper function to get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "resolved":
        return "#00875a"; // Green - completed work
      case "regression testing":
        return "#de350b"; // Red - critical testing phase
      case "test done":
        return "#36b37e"; // Light green - testing completed
      case "testing":
        return "#ffab00"; // Orange - currently being tested
      case "ready to test":
        return "#ff8b00"; // Dark orange - ready for testing
      case "review done":
        return "#6554c0"; // Purple - review completed
      case "in review":
        return "#0052cc"; // Blue - currently in review
      case "in progress":
        return "#0747a6"; // Dark blue - actively being worked on
      case "to do":
        return "#5e6c84"; // Gray - planned work
      case "open":
        return "#97a0af"; // Light gray - new/unassigned
      case "cancelled":
        return "#42526e"; // Dark gray - inactive work
      default:
        return "#ddd"; // Very light gray - unknown status
    }
  };

  // Helper function to get status sort order
  const getStatusSortOrder = (status: string): number => {
    const statusOrder = {
      resolved: 1,
      "regression testing": 2,
      "test done": 3,
      testing: 4,
      "ready to test": 5,
      "review done": 6,
      "in review": 7,
      "in progress": 8,
      "to do": 9,
      open: 10,
      cancelled: 11,
    };
    return statusOrder[status.toLowerCase() as keyof typeof statusOrder] || 99;
  };

  // Helper function to sort statuses
  const sortStatuses = (statuses: string[]): string[] => {
    return [...statuses].sort((a, b) => {
      const orderA = getStatusSortOrder(a);
      const orderB = getStatusSortOrder(b);
      return orderA - orderB;
    });
  };

  // Helper function to sort assignees
  const sortAssignees = (assignees: string[]): string[] => {
    return [...assignees].sort((a, b) => {
      // Put "Unassigned" at the end
      if (a === "Unassigned" && b !== "Unassigned") return 1;
      if (b === "Unassigned" && a !== "Unassigned") return -1;
      return a.localeCompare(b);
    });
  };

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
          sprint?: Array<{
            id: number;
            name: string;
            state?: string;
          }>;
          customfield_10020?: Array<{
            id: number;
            name: string;
            state?: string;
          }>;
          customfield_10010?: Array<{
            id: number;
            name: string;
            state?: string;
          }>;
          customfield_10014?: Array<{
            id: number;
            name: string;
            state?: string;
          }>;
          [key: string]: unknown; // Allow for other custom fields
        };
      }

      const transformedIssues =
        response.data.issues?.map((issue: JiraApiIssue) => {
          // Handle sprint data - check multiple possible sprint field names
          let sprintInfo:
            | { id: number; name: string; state?: string }
            | undefined;

          // Try multiple common sprint field names
          const possibleSprintFields = [
            "sprint",
            "customfield_10020",
            "customfield_10010",
            "customfield_10014",
          ];

          let sprintData = null;
          for (const fieldName of possibleSprintFields) {
            const fieldValue = issue.fields?.[fieldName];
            if (fieldValue) {
              sprintData = fieldValue;
              console.log(
                `Found sprint data in field ${fieldName} for ${issue.key}:`,
                fieldValue
              );
              break;
            }
          }

          // Also check for any field that might contain sprint data
          if (!sprintData) {
            const allFields = Object.keys(issue.fields || {});
            const sprintField = allFields.find((field) => {
              const value = issue.fields?.[field];
              return (
                Array.isArray(value) &&
                value.length > 0 &&
                value[0] &&
                typeof value[0] === "object" &&
                value[0] &&
                "name" in value[0] &&
                "id" in value[0]
              );
            });

            if (sprintField) {
              sprintData = issue.fields?.[sprintField] as Array<{
                id: number;
                name: string;
                state?: string;
              }>;
              console.log(
                `Found sprint data in detected field ${sprintField} for ${issue.key}:`,
                sprintData
              );
            }
          }

          if (
            sprintData &&
            Array.isArray(sprintData) &&
            sprintData.length > 0
          ) {
            // If array, get the last active/current sprint
            const activeSprint =
              sprintData.find((s) => s.state === "active") ||
              sprintData[sprintData.length - 1];
            sprintInfo = activeSprint;
          }

          return {
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
            sprint: sprintInfo,
          };
        }) || [];

      setIssues(transformedIssues);
      showToast(
        `Successfully loaded ${transformedIssues.length} issues`,
        "success"
      );
    } catch (err) {
      console.error("Failed to fetch issues:", err);
      const errorMessage =
        "Failed to fetch issues. Please check your connection and try again.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [currentJQL, setIssues, setLoading, setError, showToast]);

  // Fetch issues when JQL changes
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Improved search handler
  const handleSearchIssues = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!localJQL.trim()) {
        showToast("Please enter a JQL query", "error");
        return;
      }

      showToast("Searching issues...", "info");
      setCurrentJQL(localJQL);
    },
    [localJQL, setCurrentJQL, showToast]
  );

  // Improved refresh handler
  const handleRefreshIssues = useCallback(async () => {
    if (!currentJQL.trim()) {
      showToast("No JQL query to refresh", "error");
      return;
    }

    showToast("Refreshing issues...", "info");
    await fetchIssues();
  }, [currentJQL, fetchIssues, showToast]);

  // Get enhanced issues with approval flags
  const enhancedIssues = getEnhancedIssues();

  // Filter and sort issues
  const filteredIssues = useMemo(() => {
    let filtered = filterIssues(enhancedIssues, filters);

    // Apply multi-select status filters
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((issue) =>
        selectedStatuses.includes(issue.status)
      );
    }

    // Apply multi-select assignee filters
    if (selectedAssignees.length > 0) {
      filtered = filtered.filter(
        (issue) =>
          issue.assignee?.displayName &&
          selectedAssignees.includes(issue.assignee.displayName)
      );
    }

    // Apply multi-select sprint filters
    if (selectedSprints.length > 0) {
      filtered = filtered.filter((issue) => {
        if (selectedSprints.includes("No Sprint")) {
          return !issue.sprint || selectedSprints.includes(issue.sprint.name);
        }
        return issue.sprint && selectedSprints.includes(issue.sprint.name);
      });
    }

    // Apply remark filters if any are selected
    let remarkFiltered = filtered;
    if (remarkFilters.length > 0) {
      remarkFiltered = filtered.filter((issue) => {
        const labels = issue.labels || [];
        const issueType = issue.issueType?.toLowerCase();
        const hasTestResultApproved = labels.includes("TEST_RESULT_APPROVED");
        const hasPostCheckApproved = labels.includes("POST_CHECK_APPROVED");
        const hasPmApproved = labels.includes("PM_APPROVED");
        const needsPmApproval =
          (issueType === "story" || issueType === "production bug") &&
          !hasPmApproved;

        const issueRemarks: string[] = [];
        if (needsPmApproval) issueRemarks.push("Need PM Approve");
        if (!hasPostCheckApproved) issueRemarks.push("Need Post check");
        if (!hasTestResultApproved) issueRemarks.push("Need test result");

        // Check if any of the selected remark filters match this issue's remarks
        return remarkFilters.some((filter) => issueRemarks.includes(filter));
      });
    }

    // Apply status filters if any are selected
    let statusFiltered = remarkFiltered;
    if (statusFilters.length > 0) {
      statusFiltered = remarkFiltered.filter((issue) => {
        return statusFilters.includes(issue.status);
      });
    }

    // Apply assignee filters if any are selected
    let assigneeFiltered = statusFiltered;
    if (assigneeFilters.length > 0) {
      assigneeFiltered = statusFiltered.filter((issue) => {
        const assigneeName = issue.assignee?.displayName || "Unassigned";
        return assigneeFilters.includes(assigneeName);
      });
    }

    return getSortedIssues(assigneeFiltered);
  }, [
    enhancedIssues,
    filters,
    selectedStatuses,
    selectedAssignees,
    selectedSprints,
    remarkFilters,
    statusFilters,
    assigneeFilters,
    getSortedIssues,
  ]);

  // Debug function to check fields
  const checkFields = async () => {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      const response = await axios.get("http://localhost:3000/api/jira-fields");
      console.log("Sprint fields available:", response.data);

      // Also fetch a sample issue to see what fields are actually returned
      const sampleResponse = await axios.get(
        "http://localhost:3000/api/jira-issues",
        {
          params: { jql: "project = POSC ORDER BY created DESC" },
        }
      );

      if (sampleResponse.data.issues && sampleResponse.data.issues.length > 0) {
        const sampleIssue = sampleResponse.data.issues[0];
        console.log(
          "Sample issue fields:",
          Object.keys(sampleIssue.fields || {})
        );
        console.log("Sample issue data:", sampleIssue);

        // Check for any field that might be sprint-related
        const sprintRelatedFields = Object.keys(
          sampleIssue.fields || {}
        ).filter(
          (field) =>
            field.toLowerCase().includes("sprint") ||
            field.includes("10020") ||
            field.includes("10010") ||
            field.includes("10014")
        );
        console.log("Sprint-related fields found:", sprintRelatedFields);

        // Log the actual values of these fields
        sprintRelatedFields.forEach((field) => {
          console.log(`${field}:`, sampleIssue.fields[field]);
        });
      }
    } catch (error) {
      console.error("Error fetching fields:", error);
    }
  };

  // Multi-select dropdown component
  const MultiSelectDropdown: React.FC<{
    // eslint-disable-line @typescript-eslint/no-unused-vars
    label: string;
    options: string[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    placeholder: string;
    dropdownKey: string;
  }> = ({
    label,
    options,
    selectedValues,
    onSelectionChange,
    placeholder,
    dropdownKey,
  }) => {
    const isOpen = openDropdown === dropdownKey;

    const toggleDropdown = () => {
      setOpenDropdown(isOpen ? null : dropdownKey);
    };

    const toggleOption = (option: string) => {
      if (selectedValues.includes(option)) {
        onSelectionChange(selectedValues.filter((v) => v !== option));
      } else {
        onSelectionChange([...selectedValues, option]);
      }
    };

    const clearAll = () => {
      onSelectionChange([]);
    };

    return (
      <div style={{ position: "relative" }}>
        <label
          style={{
            display: "block",
            marginBottom: "4px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#5e6c84",
          }}
        >
          {label}
        </label>
        <div
          onClick={toggleDropdown}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #dfe1e6",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            color: "#172b4d",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: "20px",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedValues.length === 0
              ? placeholder
              : selectedValues.length === 1
              ? selectedValues[0]
              : `${selectedValues.length} selected`}
          </span>
          <span style={{ marginLeft: "8px", fontSize: "12px" }}>
            {isOpen ? "▲" : "▼"}
          </span>
        </div>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "1px solid #dfe1e6",
              borderRadius: "4px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              zIndex: 1000,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {selectedValues.length > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  backgroundColor: "#f8f9fa",
                  borderBottom: "1px solid #dfe1e6",
                  fontSize: "12px",
                  color: "#dc3545",
                  fontWeight: "500",
                }}
              >
                Clear All
              </div>
            )}
            {options.map((option) => (
              <div
                key={option}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  backgroundColor: selectedValues.includes(option)
                    ? "#e3f2fd"
                    : "white",
                  color: selectedValues.includes(option)
                    ? "#1976d2"
                    : "#172b4d",
                }}
                onMouseEnter={(e) => {
                  if (!selectedValues.includes(option)) {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedValues.includes(option)) {
                    e.currentTarget.style.backgroundColor = "white";
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleOption(option);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    marginRight: "8px",
                    cursor: "pointer",
                  }}
                />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(option);
                  }}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  {option}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Clear all multi-select filters
  const clearAllMultiSelectFilters = () => {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    setSelectedStatuses([]);
    setSelectedAssignees([]);
    setSelectedSprints([]);
  };

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
            onClick={handleRefreshIssues}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Toast Component
  const ToastNotification = () => {
    if (!toast.visible) return null;

    const getToastStyles = () => {
      const baseStyles = {
        position: "fixed" as const,
        top: "20px",
        right: "20px",
        padding: "12px 16px",
        borderRadius: "6px",
        color: "white",
        fontWeight: "500" as const,
        fontSize: "14px",
        zIndex: 9999,
        minWidth: "300px",
        maxWidth: "500px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        animation: toast.visible
          ? "slideIn 0.3s ease-out"
          : "slideOut 0.3s ease-in",
      };

      switch (toast.type) {
        case "success":
          return { ...baseStyles, backgroundColor: "#00875a" };
        case "error":
          return { ...baseStyles, backgroundColor: "#de350b" };
        case "info":
        default:
          return { ...baseStyles, backgroundColor: "#0052cc" };
      }
    };

    return (
      <div style={getToastStyles()}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>
            {toast.type === "success" && "✅"}
            {toast.type === "error" && "❌"}
            {toast.type === "info" && "ℹ️"}
          </span>
          <span>{toast.message}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <ToastNotification />
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: 0,
          backgroundColor: "#f4f5f7",
          color: "#172b4d",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
            minHeight: "100vh",
            margin: 0,
            padding: "20px",
            backgroundColor: "#ffffff",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h1 style={{ color: "#0747a6", marginTop: 0, marginBottom: 0 }}>
              Jira Issues Dashboard
            </h1>
            <button
              onClick={() => onNavigateToSprints && onNavigateToSprints()}
              style={{
                backgroundColor: "#6f42c1",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#5a2d91";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6f42c1";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <span>🏃‍♂️</span>
              Sprint Search
            </button>
          </div>

          {/* Sprint Search Section */}
          <div
            style={{
              backgroundColor: "#f0f8ff",
              border: "1px solid #b3d9ff",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                color: "#172b4d",
                marginTop: 0,
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              Sprint Search
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#172b4d",
                  fontSize: "14px",
                }}
              >
                Board ID
              </label>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
              >
                <input
                  type="text"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  style={{
                    width: "200px",
                    padding: "10px 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "#172b4d",
                  }}
                  placeholder="Enter board ID (default: 506)"
                />
                <button
                  onClick={() => searchSprints(boardId)}
                  disabled={sprintSearchLoading}
                  style={{
                    backgroundColor: sprintSearchLoading ? "#ccc" : "#0052cc",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "4px",
                    cursor: sprintSearchLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {sprintSearchLoading ? "Searching..." : "Search Sprints"}
                </button>
              </div>
            </div>

            {sprintSearchError && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  color: "#c62828",
                  border: "1px solid #ffcdd2",
                  borderRadius: "4px",
                  padding: "12px",
                  marginBottom: "16px",
                  fontSize: "14px",
                }}
              >
                {sprintSearchError}
              </div>
            )}

            {sprintSearchResults.length > 0 && (
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "4px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#e9ecef",
                    padding: "12px 16px",
                    borderBottom: "1px solid #dee2e6",
                    fontWeight: "600",
                    color: "#495057",
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>Sprint ID</div>
                  <div>Sprint Name</div>
                  <div>State</div>
                </div>
                {sprintSearchResults.map((sprint) => (
                  <div
                    key={sprint.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #dee2e6",
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr 1fr",
                      gap: "16px",
                      fontSize: "14px",
                      color: "#172b4d",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#e3f2fd";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ fontWeight: "500" }}>{sprint.id}</div>
                    <div>{sprint.name}</div>
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          textTransform: "uppercase",
                          backgroundColor:
                            sprint.state === "active"
                              ? "#e8f5e8"
                              : sprint.state === "closed"
                              ? "#ffebee"
                              : "#f8f9fa",
                          color:
                            sprint.state === "active"
                              ? "#2e7d32"
                              : sprint.state === "closed"
                              ? "#c62828"
                              : "#5e6c84",
                        }}
                      >
                        {sprint.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!sprintSearchLoading &&
              !sprintSearchError &&
              sprintSearchResults.length === 0 &&
              boardId && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#5e6c84",
                    fontStyle: "italic",
                    padding: "20px",
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "4px",
                  }}
                >
                  Click "Search Sprints" to find sprints for board ID: {boardId}
                </div>
              )}
          </div>

          {/* Search & Filters Section */}
          <div
            style={{
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                color: "#172b4d",
                marginTop: 0,
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              Search & Filters
            </h2>

            {/* JQL Query Section */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#172b4d",
                }}
              >
                JQL Query
              </label>
              <form onSubmit={handleSearchIssues}>
                <textarea
                  value={localJQL}
                  onChange={(e) => setLocalJQL(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "monospace",
                    resize: "vertical",
                    minHeight: "60px",
                    backgroundColor: "white",
                    color: "#172b4d",
                  }}
                  placeholder="Enter JQL query..."
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={loading || !localJQL.trim()}
                    style={{
                      backgroundColor:
                        loading || !localJQL.trim() ? "#ccc" : "#0052cc",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "4px",
                      cursor:
                        loading || !localJQL.trim() ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {loading ? "Searching..." : "🔍 Search Issues"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshIssues}
                    disabled={loading || !currentJQL.trim()}
                    style={{
                      backgroundColor:
                        loading || !currentJQL.trim() ? "#ccc" : "#00875a",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "4px",
                      cursor:
                        loading || !currentJQL.trim()
                          ? "not-allowed"
                          : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {loading ? "Refreshing..." : "🔄 Refresh"}
                  </button>
                </div>
              </form>
            </div>

            {/* Summary Section */}
            <div
              style={{
                borderTop: "1px solid #dfe1e6",
                paddingTop: "16px",
              }}
            >
              <h3
                style={{
                  color: "#172b4d",
                  marginBottom: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Summary
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#5e6c84",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Total Issues:</span>
                  <span style={{ fontWeight: "600", color: "#172b4d" }}>
                    {getEnhancedIssues().length}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Issues with Sprint:</span>
                  <span style={{ fontWeight: "600", color: "#2e7d32" }}>
                    {getEnhancedIssues().filter((i) => i.sprint).length}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>PM Approval Required:</span>
                  <span style={{ fontWeight: "600", color: "#ff8b00" }}>
                    {
                      getEnhancedIssues().filter((i) => i.pmApprovalRequired)
                        .length
                    }
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Post Check Required:</span>
                  <span style={{ fontWeight: "600", color: "#0052cc" }}>
                    {
                      getEnhancedIssues().filter(
                        (i) => i.postCheckApprovalRequired
                      ).length
                    }
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Test Result Required:</span>
                  <span style={{ fontWeight: "600", color: "#6554c0" }}>
                    {
                      getEnhancedIssues().filter(
                        (i) => i.testResultApprovalRequired
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            id="controls"
            style={{
              marginBottom: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <div>
              <label style={{ marginBottom: "5px", display: "block" }}>
                Filter by Approval Needs:
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={clearRemarkFilters}
                  style={{
                    backgroundColor:
                      remarkFilters.length === 0 ? "#0052cc" : "#f4f5f7",
                    color: remarkFilters.length === 0 ? "white" : "#5e6c84",
                    border:
                      remarkFilters.length === 0 ? "none" : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                  }}
                >
                  Show All {remarkFilters.length === 0 && "✓"}
                </button>
                <button
                  onClick={() => toggleRemarkFilter("Need PM Approve")}
                  style={{
                    backgroundColor: remarkFilters.includes("Need PM Approve")
                      ? "#ffebee"
                      : "#f4f5f7",
                    color: remarkFilters.includes("Need PM Approve")
                      ? "#c62828"
                      : "#5e6c84",
                    border: remarkFilters.includes("Need PM Approve")
                      ? "1px solid #ffcdd2"
                      : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    fontWeight: remarkFilters.includes("Need PM Approve")
                      ? "600"
                      : "normal",
                  }}
                >
                  Need PM Approve{" "}
                  {remarkFilters.includes("Need PM Approve") && "✓"}
                </button>
                <button
                  onClick={() => toggleRemarkFilter("Need Post check")}
                  style={{
                    backgroundColor: remarkFilters.includes("Need Post check")
                      ? "#e8f5e8"
                      : "#f4f5f7",
                    color: remarkFilters.includes("Need Post check")
                      ? "#2e7d32"
                      : "#5e6c84",
                    border: remarkFilters.includes("Need Post check")
                      ? "1px solid #c8e6c9"
                      : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    fontWeight: remarkFilters.includes("Need Post check")
                      ? "600"
                      : "normal",
                  }}
                >
                  Need Post Check{" "}
                  {remarkFilters.includes("Need Post check") && "✓"}
                </button>
                <button
                  onClick={() => toggleRemarkFilter("Need test result")}
                  style={{
                    backgroundColor: remarkFilters.includes("Need test result")
                      ? "#e3f2fd"
                      : "#f4f5f7",
                    color: remarkFilters.includes("Need test result")
                      ? "#1976d2"
                      : "#5e6c84",
                    border: remarkFilters.includes("Need test result")
                      ? "1px solid #bbdefb"
                      : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    fontWeight: remarkFilters.includes("Need test result")
                      ? "600"
                      : "normal",
                  }}
                >
                  Need Test Result{" "}
                  {remarkFilters.includes("Need test result") && "✓"}
                </button>
                {remarkFilters.length > 0 && (
                  <button
                    onClick={clearRemarkFilters}
                    style={{
                      backgroundColor: "#ff5722",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              {remarkFilters.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.9em",
                    color: "#5e6c84",
                  }}
                >
                  Active filters: {remarkFilters.join(", ")}
                  <span style={{ fontWeight: "600", color: "#0052cc" }}>
                    ({filteredIssues.length} issues)
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ marginBottom: "5px", display: "block" }}>
                Filter by Status:
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={clearStatusFilters}
                  style={{
                    backgroundColor:
                      statusFilters.length === 0 ? "#0052cc" : "#f4f5f7",
                    color: statusFilters.length === 0 ? "white" : "#5e6c84",
                    border:
                      statusFilters.length === 0 ? "none" : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                  }}
                >
                  All Status {statusFilters.length === 0 && "✓"}
                </button>
                {sortStatuses([
                  ...new Set(getEnhancedIssues().map((issue) => issue.status)),
                ]).map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    style={{
                      backgroundColor: statusFilters.includes(status)
                        ? "#e3f2fd"
                        : "#f4f5f7",
                      color: statusFilters.includes(status)
                        ? "#1976d2"
                        : "#5e6c84",
                      border: statusFilters.includes(status)
                        ? "1px solid #bbdefb"
                        : "1px solid #dfe1e6",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      fontWeight: statusFilters.includes(status)
                        ? "600"
                        : "normal",
                    }}
                  >
                    {status} {statusFilters.includes(status) && "✓"}
                  </button>
                ))}
                {statusFilters.length > 0 && (
                  <button
                    onClick={clearStatusFilters}
                    style={{
                      backgroundColor: "#ff5722",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                    }}
                  >
                    Clear Status Filters
                  </button>
                )}
              </div>
              {statusFilters.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.9em",
                    color: "#5e6c84",
                  }}
                >
                  Active status filters: {statusFilters.join(", ")}
                  <span style={{ fontWeight: "600", color: "#0052cc" }}>
                    ({filteredIssues.length} issues)
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ marginBottom: "5px", display: "block" }}>
                Filter by Assignee:
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={clearAssigneeFilters}
                  style={{
                    backgroundColor:
                      assigneeFilters.length === 0 ? "#0052cc" : "#f4f5f7",
                    color: assigneeFilters.length === 0 ? "white" : "#5e6c84",
                    border:
                      assigneeFilters.length === 0
                        ? "none"
                        : "1px solid #dfe1e6",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                  }}
                >
                  All Assignees {assigneeFilters.length === 0 && "✓"}
                </button>
                {sortAssignees([
                  ...new Set(
                    getEnhancedIssues().map(
                      (issue) => issue.assignee?.displayName || "Unassigned"
                    )
                  ),
                ]).map((assignee) => (
                  <button
                    key={assignee}
                    onClick={() => toggleAssigneeFilter(assignee)}
                    style={{
                      backgroundColor: assigneeFilters.includes(assignee)
                        ? "#e8f5e8"
                        : "#f4f5f7",
                      color: assigneeFilters.includes(assignee)
                        ? "#2e7d32"
                        : "#5e6c84",
                      border: assigneeFilters.includes(assignee)
                        ? "1px solid #c8e6c9"
                        : "1px solid #dfe1e6",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      fontWeight: assigneeFilters.includes(assignee)
                        ? "600"
                        : "normal",
                    }}
                  >
                    {assignee} {assigneeFilters.includes(assignee) && "✓"}
                  </button>
                ))}
                {assigneeFilters.length > 0 && (
                  <button
                    onClick={clearAssigneeFilters}
                    style={{
                      backgroundColor: "#ff5722",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                    }}
                  >
                    Clear Assignee Filters
                  </button>
                )}
              </div>
              {assigneeFilters.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.9em",
                    color: "#5e6c84",
                  }}
                >
                  Active assignee filters: {assigneeFilters.join(", ")}
                  <span style={{ fontWeight: "600", color: "#0052cc" }}>
                    ({filteredIssues.length} issues)
                  </span>
                </div>
              )}
            </div>

            {/* Task List Generation Section - Always Visible */}
            <div>
              <button
                onClick={generateTaskList}
                style={{
                  backgroundColor: "#4caf50",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "0.9em",
                  fontWeight: "600",
                  marginRight: "10px",
                }}
              >
                📋 Generate Task List
              </button>
              {(remarkFilters.length > 0 ||
                statusFilters.length > 0 ||
                assigneeFilters.length > 0) && (
                <button
                  onClick={clearAllAdvancedFilters}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    fontWeight: "600",
                  }}
                >
                  Clear All Advanced Filters
                </button>
              )}
            </div>

            {/* Generated Task List Section */}
            {showTaskList && (
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "20px",
                  marginTop: "20px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    color: "#172b4d",
                    marginTop: 0,
                    marginBottom: "16px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  Generated Task List (
                  {taskListItems.filter((item) => item.selected).length} of{" "}
                  {taskListItems.length} selected)
                </h3>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#5e6c84",
                    marginBottom: "12px",
                    fontWeight: "600",
                  }}
                >
                  Format: {getFormatString()} (sorted by assignee)
                </div>

                {/* Format Field Selection */}
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "4px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#172b4d",
                    }}
                  >
                    Select Fields to Include:
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {[
                      { key: "key", label: "Key (with link)" },
                      { key: "status", label: "Status" },
                      { key: "assignee", label: "Assignee" },
                      { key: "summary", label: "Summary" },
                      { key: "remarks", label: "Remarks" },
                      { key: "priority", label: "Priority" },
                      { key: "sprint", label: "Sprint" },
                      { key: "issueType", label: "Issue Type" },
                      { key: "created", label: "Created" },
                      { key: "updated", label: "Updated" },
                    ].map((field) => (
                      <label
                        key={field.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "13px",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            formatFields[field.key as keyof typeof formatFields]
                          }
                          onChange={() =>
                            handleFormatFieldToggle(
                              field.key as keyof typeof formatFields
                            )
                          }
                          style={{
                            marginRight: "6px",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ color: "#172b4d" }}>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Select by Jira Issues - Collapsible */}
                <div
                  style={{
                    marginBottom: "12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() =>
                      setShowSelectAllSection(!showSelectAllSection)
                    }
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#e9ecef",
                      borderRadius: showSelectAllSection
                        ? "4px 4px 0 0"
                        : "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      borderBottom: showSelectAllSection
                        ? "1px solid #dfe1e6"
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#172b4d",
                      }}
                    >
                      Select by Jira Issues (
                      {taskListItems.filter((item) => item.selected).length} of{" "}
                      {taskListItems.length} selected)
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#5e6c84",
                        fontWeight: "500",
                      }}
                    >
                      {showSelectAllSection ? "▲ Hide" : "▼ Show"}
                    </span>
                  </div>

                  {/* Collapsible Content */}
                  {showSelectAllSection && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      {/* Select All / None Control */}
                      <div
                        style={{
                          marginBottom: "12px",
                          padding: "8px 12px",
                          backgroundColor: "#e9ecef",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{
                            marginRight: "8px",
                            cursor: "pointer",
                          }}
                        />
                        <label
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#172b4d",
                            cursor: "pointer",
                          }}
                          onClick={() => handleSelectAll(!selectAll)}
                        >
                          Select All / None
                        </label>
                      </div>

                      {/* Task List with Checkboxes */}
                      <div
                        style={{
                          maxHeight: "400px",
                          overflowY: "auto",
                          border: "1px solid #dfe1e6",
                          borderRadius: "4px",
                          backgroundColor: "white",
                        }}
                      >
                        {taskListItems.map((item, index) => (
                          <div
                            key={item.id}
                            style={{
                              padding: "8px 12px",
                              borderBottom:
                                index < taskListItems.length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none",
                              display: "flex",
                              alignItems: "flex-start",
                              fontSize: "12px",
                              fontFamily: "monospace",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) =>
                                handleTaskSelection(item.id, e.target.checked)
                              }
                              style={{
                                marginRight: "8px",
                                marginTop: "2px",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                wordBreak: "break-all",
                                color: item.selected ? "#172b4d" : "#6b778c",
                                textDecoration: item.selected
                                  ? "none"
                                  : "line-through",
                                opacity: item.selected ? 1 : 0.6,
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy Text Area (Hidden by default, shows selected items) */}
                <div style={{ marginTop: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#5e6c84",
                    }}
                  >
                    Selected Items (
                    {taskListItems.filter((item) => item.selected).length}{" "}
                    items):
                  </label>
                  <textarea
                    value={generatedTaskList}
                    readOnly
                    style={{
                      width: "100%",
                      minHeight: "150px",
                      maxHeight: "400px",
                      height: `${Math.max(
                        150,
                        Math.min(
                          400,
                          generatedTaskList.split("\n").length * 20 + 40
                        )
                      )}px`,
                      padding: "12px",
                      border: "1px solid #dfe1e6",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      backgroundColor: "#f8f9fa",
                      color: "#172b4d",
                      resize: "vertical",
                      boxSizing: "border-box",
                      overflow: "auto",
                    }}
                    placeholder="Selected tasks will appear here..."
                  />
                  <div style={{ marginTop: "12px" }}>
                    <button
                      onClick={copyTaskList}
                      style={{
                        backgroundColor: "#0052cc",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        marginRight: "10px",
                      }}
                    >
                      📋 Copy Selected (
                      {taskListItems.filter((item) => item.selected).length})
                    </button>
                    <button
                      onClick={() => setShowTaskList(false)}
                      style={{
                        backgroundColor: "#6b778c",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div
              style={{
                padding: "10px",
                margin: "10px 0",
                borderRadius: "3px",
                backgroundColor: "#e9f2ff",
                color: "#0052cc",
              }}
            >
              Loading issues...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "10px",
                margin: "10px 0",
                borderRadius: "3px",
                backgroundColor: "#ffebee",
                color: "#c62828",
                border: "1px solid #ffcdd2",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "20px",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("key")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "8%",
                      cursor: "pointer",
                    }}
                  >
                    Key
                    <span style={{ float: "right" }}>{getSortIcon("key")}</span>
                  </th>
                  <th
                    onClick={() => handleSort("summary")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "20%",
                      cursor: "pointer",
                    }}
                  >
                    Summary
                    <span style={{ float: "right" }}>
                      {getSortIcon("summary")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("sprint")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "10%",
                      cursor: "pointer",
                    }}
                  >
                    Sprint
                    <span style={{ float: "right" }}>
                      {getSortIcon("sprint")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "9%",
                      cursor: "pointer",
                    }}
                  >
                    Status
                    <span style={{ float: "right" }}>
                      {getSortIcon("status")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("type")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "9%",
                      cursor: "pointer",
                    }}
                  >
                    Type
                    <span style={{ float: "right" }}>
                      {getSortIcon("type")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("assignee")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "11%",
                      cursor: "pointer",
                    }}
                  >
                    Assignee
                    <span style={{ float: "right" }}>
                      {getSortIcon("assignee")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("priority")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "7%",
                      cursor: "pointer",
                    }}
                  >
                    Priority
                    <span style={{ float: "right" }}>
                      {getSortIcon("priority")}
                    </span>
                  </th>
                  <th
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "13%",
                    }}
                  >
                    Labels
                  </th>
                  <th
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "10%",
                    }}
                  >
                    Remarks
                  </th>
                  <th
                    onClick={() => handleSort("created")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "5.5%",
                      cursor: "pointer",
                    }}
                  >
                    Created
                    <span style={{ float: "right" }}>
                      {getSortIcon("created")}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort("updated")}
                    style={{
                      border: "1px solid #dfe1e6",
                      padding: "10px 12px",
                      textAlign: "left",
                      backgroundColor: "#f4f5f7",
                      fontWeight: 600,
                      color: "#5e6c84",
                      width: "5.5%",
                      cursor: "pointer",
                    }}
                  >
                    Updated
                    <span style={{ float: "right" }}>
                      {getSortIcon("updated")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue, index) => (
                  <tr
                    key={issue.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      window.open(getJiraIssueUrl(issue.key), "_blank")
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#e3f2fd";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        index % 2 === 0 ? "#ffffff" : "#f9fafb";
                    }}
                  >
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      <a
                        href={getJiraIssueUrl(issue.key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0052cc", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {issue.key}
                      </a>
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                        maxWidth: "250px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {issue.summary}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                        fontSize: "0.9em",
                      }}
                    >
                      {issue.sprint ? (
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: "#e8f5e8",
                            color: "#2e7d32",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            fontSize: "0.8em",
                            fontWeight: 500,
                            border: "1px solid #c8e6c9",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={issue.sprint.name}
                        >
                          {issue.sprint.name}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#999",
                            fontStyle: "italic",
                            fontSize: "0.9em",
                          }}
                        >
                          No sprint
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          backgroundColor: getStatusColor(issue.status),
                          color: "white",
                        }}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      {issue.issueType}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      {issue.assignee?.displayName || "Unassigned"}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "3px",
                          fontSize: "0.8em",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          backgroundColor:
                            issue.priority === "Highest"
                              ? "#de350b"
                              : issue.priority === "High"
                              ? "#ff5630"
                              : issue.priority === "Medium"
                              ? "#ffab00"
                              : issue.priority === "Low"
                              ? "#36b37e"
                              : issue.priority === "Lowest"
                              ? "#6b778c"
                              : "#ddd",
                          color: "white",
                        }}
                      >
                        {issue.priority}
                      </span>
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                        maxWidth: "200px",
                        overflow: "hidden",
                      }}
                    >
                      {issue.labels && issue.labels.length > 0 ? (
                        issue.labels.map((label, labelIndex) => (
                          <span
                            key={labelIndex}
                            style={{
                              display: "inline-block",
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.8em",
                              margin: "1px 2px",
                              border: "1px solid #bbdefb",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span
                          style={{
                            color: "#999",
                            fontStyle: "italic",
                            fontSize: "0.9em",
                          }}
                        >
                          No labels
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                      }}
                    >
                      {(() => {
                        const labels = issue.labels || [];
                        const issueType = issue.issueType?.toLowerCase();
                        const hasTestResultApproved = labels.includes(
                          "TEST_RESULT_APPROVED"
                        );
                        const hasPostCheckApproved = labels.includes(
                          "POST_CHECK_APPROVED"
                        );
                        const hasPmApproved = labels.includes("PM_APPROVED");
                        const needsPmApproval =
                          (issueType === "story" ||
                            issueType === "production bug") &&
                          !hasPmApproved;

                        const remarks = [];

                        if (needsPmApproval) {
                          remarks.push("Need PM Approve");
                        }

                        if (!hasPostCheckApproved) {
                          remarks.push("Need Post check");
                        }

                        if (!hasTestResultApproved) {
                          remarks.push("Need test result");
                        }

                        if (remarks.length === 0) {
                          return (
                            <span
                              style={{
                                color: "#999",
                                fontStyle: "italic",
                                fontSize: "0.9em",
                              }}
                            >
                              No remarks
                            </span>
                          );
                        }

                        return remarks.map((remark, index) => (
                          <span
                            key={index}
                            style={{
                              display: "inline-block",
                              backgroundColor:
                                remark === "Need PM Approve"
                                  ? "#ffebee"
                                  : remark === "Need Post check"
                                  ? "#e8f5e8"
                                  : "#e3f2fd",
                              color:
                                remark === "Need PM Approve"
                                  ? "#c62828"
                                  : remark === "Need Post check"
                                  ? "#2e7d32"
                                  : "#1976d2",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontSize: "0.8em",
                              margin: "1px",
                              border:
                                remark === "Need PM Approve"
                                  ? "1px solid #ffcdd2"
                                  : remark === "Need Post check"
                                  ? "1px solid #c8e6c9"
                                  : "1px solid #bbdefb",
                            }}
                          >
                            {remark}
                          </span>
                        ));
                      })()}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                        fontSize: "0.9em",
                      }}
                    >
                      {formatDate(issue.created)}
                    </td>
                    <td
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "10px 12px",
                        verticalAlign: "top",
                        fontSize: "0.9em",
                      }}
                    >
                      {formatDate(issue.updated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && filteredIssues.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                fontStyle: "italic",
                padding: "20px",
              }}
            >
              No issues found.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Board;
