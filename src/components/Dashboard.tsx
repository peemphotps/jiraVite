import React, { useState, useEffect, useCallback, useRef } from "react";
import { useJiraStore } from "../store";
import { formatDate, getJiraSprintUrl, DEFAULT_BOARD_ID } from "../utils";
import type { Sprint, Board } from "../types";
import axios from "axios";

interface DashboardProps {
  onNavigateToDashboard?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToDashboard }) => {
  const {
    sprints,
    sprintsLoading,
    sprintsError,
    setSprints,
    setSprintsLoading,
    setSprintsError,
    boards,
    boardsLoading,
    boardsError,
    setBoards,
    setBoardsLoading,
    setBoardsError,
  } = useJiraStore();

  const [boardId, setBoardId] = useState(DEFAULT_BOARD_ID.toString());
  const [sprintName, setSprintName] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [jiraStatusFilter, setJiraStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [boardSearchTerm, setBoardSearchTerm] = useState("");
  const [showBoardsList, setShowBoardsList] = useState(false);
  const [boardsListSearchTerm, setBoardsListSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowBoardDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchBoards = useCallback(async () => {
    setBoardsLoading(true);
    setBoardsError(null);

    try {
      const response = await axios.get(
        "http://localhost:3000/api/jira-boards",
        {
          params: {
            type: "scrum",
            maxResults: 100,
          },
        }
      );

      // Transform API response to match our interface
      interface JiraApiBoard {
        id: number;
        name: string;
        type: string;
        location?: {
          projectId?: number;
          projectKey?: string;
          projectName?: string;
        };
      }

      const transformedBoards =
        response.data.values?.map((board: JiraApiBoard) => ({
          id: board.id,
          name: board.name,
          type: board.type,
          location: board.location,
        })) || [];

      setBoards(transformedBoards);
    } catch (err) {
      console.error("Failed to fetch boards:", err);
      setBoardsError("Failed to fetch boards. Using manual input only.");
    } finally {
      setBoardsLoading(false);
    }
  }, [setBoards, setBoardsLoading, setBoardsError]);

  // Fetch boards on component mount
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

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

  // Helper function to sort sprints
  const sortSprints = (sprintsList: Sprint[]) => {
    const sortedSprints = [...sprintsList];

    switch (sortBy) {
      case "newest":
        return sortedSprints.sort((a, b) => {
          // Sort by start date first, then end date, then creation order
          const aDate = a.startDate || a.endDate || "";
          const bDate = b.startDate || b.endDate || "";
          if (!aDate && !bDate) return b.id - a.id; // If no dates, sort by ID (newer first)
          if (!aDate) return 1; // No date goes to end
          if (!bDate) return -1; // No date goes to end
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
      case "oldest":
        return sortedSprints.sort((a, b) => {
          // Sort by start date first, then end date, then creation order
          const aDate = a.startDate || a.endDate || "";
          const bDate = b.startDate || b.endDate || "";
          if (!aDate && !bDate) return a.id - b.id; // If no dates, sort by ID (older first)
          if (!aDate) return 1; // No date goes to end
          if (!bDate) return -1; // No date goes to end
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        });
      case "name":
        return sortedSprints.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sortedSprints;
    }
  };

  // Helper function to filter boards by search term
  const filterBoardsBySearchTerm = (
    boardsList: Board[],
    searchTerm: string
  ) => {
    if (!searchTerm.trim()) return boardsList;

    const term = searchTerm.toLowerCase();
    return boardsList.filter(
      (board) =>
        board.name.toLowerCase().includes(term) ||
        board.id.toString().includes(term) ||
        (board.location?.projectKey &&
          board.location.projectKey.toLowerCase().includes(term)) ||
        (board.location?.projectName &&
          board.location.projectName.toLowerCase().includes(term))
    );
  };

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        margin: 0,
        padding: 0,
        backgroundColor: "#f4f5f7",
        color: "#172b4d",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      <div
        className="dashboard-container"
        style={{
          flex: 1,
          width: "100%",
          padding: "16px",
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          maxWidth: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "16px",
            width: "100%",
          }}
        >
          <h1
            style={{
              color: "#0747a6",
              marginTop: 0,
              marginBottom: 0,
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              lineHeight: "1.2",
            }}
          >
            Sprint Search Dashboard
          </h1>
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
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
                flexShrink: 0,
                minWidth: "fit-content",
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
              <span>📊</span>
              <span
                style={{
                  display: "var(--mobile-hide, inline)",
                }}
              >
                Back to Issues Dashboard
              </span>
              <span
                style={{
                  display: "var(--mobile-show, none)",
                }}
              >
                Back
              </span>
            </button>
          )}
        </div>

        {/* Collapsible Boards List */}
        <div
          style={{
            backgroundColor: "#f0f8ff",
            border: "1px solid #b3d9ff",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            width: "100%",
            boxSizing: "border-box",
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
            Available Boards
            <div
              style={{
                fontSize: "12px",
                color: "#5e6c84",
                fontWeight: "normal",
                marginTop: "4px",
              }}
            >
              Filtered to projects: WNPOS, PS, POSC
            </div>
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setShowBoardsList(!showBoardsList)}
              style={{
                backgroundColor: showBoardsList ? "#0052cc" : "#f4f5f7",
                color: showBoardsList ? "white" : "#172b4d",
                border: "1px solid #dfe1e6",
                padding: "10px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <span>
                {showBoardsList ? "Hide" : "Show"} Available Boards (
                {boards.length} loaded)
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {boardsLoading && (
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #dfe1e6",
                      borderTop: "2px solid #0052cc",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchBoards();
                  }}
                  disabled={boardsLoading}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    padding: "4px",
                    cursor: boardsLoading ? "not-allowed" : "pointer",
                    opacity: boardsLoading ? 0.5 : 1,
                  }}
                  title="Refresh boards"
                >
                  🔄
                </button>
                <span>{showBoardsList ? "▲" : "▼"}</span>
              </div>
            </button>
          </div>

          {showBoardsList && (
            <div>
              {boardsError ? (
                <div
                  style={{
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    border: "1px solid #ffcdd2",
                    borderRadius: "4px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>
                    Failed to load boards
                  </p>
                  <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
                    {boardsError}
                  </p>
                  <button
                    onClick={fetchBoards}
                    style={{
                      backgroundColor: "#c62828",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              ) : boards.length === 0 ? (
                <div
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "4px",
                    padding: "16px",
                    textAlign: "center",
                    color: "#5e6c84",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    No boards found for projects WNPOS, PS, or POSC. Click
                    refresh to try loading boards again.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Search input for boards list */}
                  <div style={{ marginBottom: "16px" }}>
                    <input
                      type="text"
                      placeholder="Search boards by name, ID, or project key..."
                      value={boardsListSearchTerm}
                      onChange={(e) => setBoardsListSearchTerm(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #dfe1e6",
                        borderRadius: "4px",
                        fontSize: "14px",
                        backgroundColor: "white",
                        color: "#172b4d",
                      }}
                    />
                  </div>

                  {/* Boards grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                      gap: "12px",
                      maxHeight: "400px",
                      overflowY: "auto",
                      border: "1px solid #dfe1e6",
                      borderRadius: "4px",
                      padding: "12px",
                      backgroundColor: "#f8f9fa",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {filterBoardsBySearchTerm(boards, boardsListSearchTerm).map(
                      (board) => (
                        <div
                          key={board.id}
                          onClick={() => {
                            setBoardId(board.id.toString());
                            setShowBoardsList(false);
                            setBoardsListSearchTerm("");
                          }}
                          style={{
                            backgroundColor: "white",
                            border: "1px solid #dfe1e6",
                            borderRadius: "4px",
                            padding: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#e3f2fd";
                            e.currentTarget.style.borderColor = "#1976d2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "white";
                            e.currentTarget.style.borderColor = "#dfe1e6";
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#172b4d",
                              marginBottom: "4px",
                              fontSize: "14px",
                            }}
                          >
                            {board.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#5e6c84",
                              marginBottom: "4px",
                            }}
                          >
                            <span>ID: {board.id}</span>
                            {board.location?.projectKey && (
                              <span style={{ marginLeft: "8px" }}>
                                • Project: {board.location.projectKey}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            {board.location?.projectName && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#5e6c84",
                                  fontStyle: "italic",
                                  flex: 1,
                                  marginRight: "8px",
                                }}
                                title={board.location.projectName}
                              >
                                {board.location.projectName.length > 30
                                  ? board.location.projectName.substring(
                                      0,
                                      30
                                    ) + "..."
                                  : board.location.projectName}
                              </span>
                            )}
                            <span
                              style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                fontWeight: "500",
                              }}
                            >
                              {board.type}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* No search results */}
                  {filterBoardsBySearchTerm(boards, boardsListSearchTerm)
                    .length === 0 &&
                    boardsListSearchTerm && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#5e6c84",
                          fontStyle: "italic",
                        }}
                      >
                        No boards match your search "{boardsListSearchTerm}"
                        <br />
                        <span style={{ fontSize: "12px" }}>
                          Try searching by board name, ID, or project key
                        </span>
                        <br />
                        <button
                          onClick={() => setBoardsListSearchTerm("")}
                          style={{
                            marginTop: "8px",
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#0052cc",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontSize: "14px",
                          }}
                        >
                          Clear search
                        </button>
                      </div>
                    )}

                  {/* Stats footer */}
                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid #dfe1e6",
                      fontSize: "12px",
                      color: "#5e6c84",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      Showing{" "}
                      {
                        filterBoardsBySearchTerm(boards, boardsListSearchTerm)
                          .length
                      }{" "}
                      of {boards.length} boards
                    </span>
                    <span>Click any board to select it</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Form */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            width: "100%",
            boxSizing: "border-box",
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
            Sprint Search & Filters
          </h2>

          <form onSubmit={handleSubmit}>
            <div
              className="responsive-grid"
              style={{
                marginBottom: "20px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#172b4d",
                    fontSize: "14px",
                  }}
                >
                  Board ID <span style={{ color: "#de350b" }}>*</span>
                  {boards.length > 0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "12px",
                        color: "#00875a",
                        fontWeight: "normal",
                      }}
                    >
                      ({boards.length} boards loaded)
                    </span>
                  )}
                </label>
                <div style={{ position: "relative" }} ref={dropdownRef}>
                  <input
                    type="number"
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      border: "1px solid #dfe1e6",
                      borderRadius: "4px",
                      fontSize: "14px",
                      backgroundColor: "white",
                      color: "#172b4d",
                    }}
                    placeholder="Enter board ID (e.g., 506)"
                    required
                  />
                  <button
                    type="button"
                    onClick={fetchBoards}
                    disabled={boardsLoading}
                    style={{
                      position: "absolute",
                      right: "30px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: boardsLoading ? "not-allowed" : "pointer",
                      opacity: boardsLoading ? 0.5 : 1,
                    }}
                    title="Refresh boards list"
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                    }}
                    title="Select from available boards"
                  >
                    {showBoardDropdown ? "▲" : "▼"}
                  </button>

                  {showBoardDropdown && (
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
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {boardsLoading ? (
                        <div
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            color: "#5e6c84",
                            fontSize: "14px",
                          }}
                        >
                          Loading boards...
                        </div>
                      ) : boardsError ? (
                        <div
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            color: "#c62828",
                            fontSize: "14px",
                          }}
                        >
                          {boardsError}
                        </div>
                      ) : boards.length === 0 ? (
                        <div
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            color: "#5e6c84",
                            fontSize: "14px",
                          }}
                        >
                          No boards found for projects WNPOS, PS, or POSC
                        </div>
                      ) : (
                        <div>
                          {/* Search input */}
                          <div
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #dfe1e6",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Search boards..."
                              value={boardSearchTerm}
                              onChange={(e) =>
                                setBoardSearchTerm(e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #dfe1e6",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            />
                          </div>

                          {/* Boards list */}
                          <div
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {filterBoardsBySearchTerm(
                              boards,
                              boardSearchTerm
                            ).map((board) => (
                              <button
                                key={board.id}
                                type="button"
                                onClick={() => {
                                  setBoardId(board.id.toString());
                                  setShowBoardDropdown(false);
                                  setBoardSearchTerm("");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  textAlign: "left",
                                  backgroundColor: "white",
                                  border: "none",
                                  borderBottom: "1px solid #f0f0f0",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#e3f2fd";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "white";
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "500",
                                    color: "#172b4d",
                                  }}
                                >
                                  {board.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#5e6c84",
                                  }}
                                >
                                  ID: {board.id} • Type: {board.type}
                                  {board.location?.projectKey && (
                                    <span>
                                      {" "}
                                      • Project: {board.location.projectKey}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}

                            {filterBoardsBySearchTerm(boards, boardSearchTerm)
                              .length === 0 &&
                              boardSearchTerm && (
                                <div
                                  style={{
                                    padding: "12px",
                                    textAlign: "center",
                                    color: "#5e6c84",
                                    fontSize: "14px",
                                  }}
                                >
                                  No boards match "{boardSearchTerm}"
                                  <br />
                                  <span style={{ fontSize: "12px" }}>
                                    Try searching by name, ID, or project key
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#172b4d",
                    fontSize: "14px",
                  }}
                >
                  Sprint Name (Optional)
                </label>
                <input
                  type="text"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "#172b4d",
                  }}
                  placeholder="Filter by sprint name"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#172b4d",
                    fontSize: "14px",
                  }}
                >
                  Filter by Jira Status
                </label>
                <select
                  value={jiraStatusFilter}
                  onChange={(e) => setJiraStatusFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "#172b4d",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="future">Future</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#172b4d",
                    fontSize: "14px",
                  }}
                >
                  Sort by Date
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "#172b4d",
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">By Name</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={sprintsLoading}
                style={{
                  backgroundColor: sprintsLoading ? "#ccc" : "#0052cc",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "4px",
                  cursor: sprintsLoading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "44px",
                  flexShrink: 0,
                }}
              >
                {sprintsLoading ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid white",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    Searching...
                  </>
                ) : (
                  <>🔍 Search Sprints</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {sprintsLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "clamp(20px, 5vw, 40px) 16px",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                border: "1px solid #e9ecef",
                borderRadius: "8px",
                padding: "clamp(16px, 5vw, 32px)",
                maxWidth: "400px",
                margin: "0 auto",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  border: "4px solid #e9ecef",
                  borderTop: "4px solid #0052cc",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 24px",
                }}
              ></div>
              <p
                style={{
                  color: "#172b4d",
                  fontWeight: "500",
                  fontSize: "18px",
                  margin: "0 0 8px 0",
                }}
              >
                Loading sprints...
              </p>
              <p
                style={{
                  color: "#5e6c84",
                  fontSize: "14px",
                  margin: 0,
                }}
              >
                Please wait while we fetch your data
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {sprintsError && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              border: "1px solid #ffcdd2",
              borderRadius: "8px",
              padding: "clamp(12px, 4vw, 20px)",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffcdd2",
                  borderRadius: "50%",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3
                  style={{
                    color: "#c62828",
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  Error Loading Sprints
                </h3>
                <p style={{ color: "#c62828", margin: "0 0 12px 0" }}>
                  {sprintsError}
                </p>
                <button
                  onClick={fetchSprints}
                  style={{
                    backgroundColor: "#c62828",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {!sprintsLoading && !sprintsError && sprints.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e9ecef",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Table Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e9ecef",
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <h2
                  style={{
                    color: "#172b4d",
                    margin: 0,
                    fontSize: "clamp(1rem, 3vw, 1.125rem)",
                    fontWeight: "600",
                    lineHeight: "1.3",
                  }}
                >
                  Found {sprints.length} sprint{sprints.length !== 1 ? "s" : ""}{" "}
                  for Board {boardId}
                </h2>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#5e6c84",
                    backgroundColor: "white",
                    padding: "6px 12px",
                    border: "1px solid #dfe1e6",
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                >
                  <span className="desktop-only">
                    Click any row to open in Jira
                  </span>
                  <span className="mobile-only">Tap to open</span>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-only table-container">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "800px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f4f5f7" }}>
                    <th
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: "600",
                        color: "#5e6c84",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Sprint Details
                    </th>
                    <th
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: "600",
                        color: "#5e6c84",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: "600",
                        color: "#5e6c84",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Dates
                    </th>
                    <th
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: "600",
                        color: "#5e6c84",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Goal
                    </th>
                    <th
                      style={{
                        border: "1px solid #dfe1e6",
                        padding: "12px",
                        textAlign: "right",
                        fontWeight: "600",
                        color: "#5e6c84",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortSprints(sprints).map((sprint, index) => (
                    <tr
                      key={sprint.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? "white" : "#f9fafb",
                        cursor: "pointer",
                      }}
                      onClick={() => openSprintInJira(sprint.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e3f2fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          index % 2 === 0 ? "white" : "#f9fafb";
                      }}
                    >
                      {/* Sprint Details */}
                      <td
                        style={{
                          border: "1px solid #dfe1e6",
                          padding: "16px 12px",
                          verticalAlign: "top",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#172b4d",
                              marginBottom: "4px",
                            }}
                          >
                            {sprint.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#5e6c84",
                              backgroundColor: "#f4f5f7",
                              padding: "2px 8px",
                              borderRadius: "3px",
                              display: "inline-block",
                            }}
                          >
                            ID: {sprint.id} • Board: {sprint.boardId}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td
                        style={{
                          border: "1px solid #dfe1e6",
                          padding: "16px 12px",
                          verticalAlign: "top",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            textTransform: "uppercase",
                            backgroundColor:
                              sprint.state === "active"
                                ? "#e8f5e8"
                                : sprint.state === "closed"
                                ? "#f4f5f7"
                                : "#e3f2fd",
                            color:
                              sprint.state === "active"
                                ? "#2e7d32"
                                : sprint.state === "closed"
                                ? "#5e6c84"
                                : "#1976d2",
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              marginRight: "8px",
                              backgroundColor:
                                sprint.state === "active"
                                  ? "#2e7d32"
                                  : sprint.state === "closed"
                                  ? "#5e6c84"
                                  : "#1976d2",
                              animation:
                                sprint.state === "active"
                                  ? "pulse 2s infinite"
                                  : "none",
                            }}
                          ></div>
                          {sprint.state.charAt(0).toUpperCase() +
                            sprint.state.slice(1)}
                        </span>
                      </td>

                      {/* Dates */}
                      <td
                        style={{
                          border: "1px solid #dfe1e6",
                          padding: "16px 12px",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ fontSize: "14px", color: "#172b4d" }}>
                          {sprint.startDate && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#5e6c84",
                                  width: "48px",
                                  fontWeight: "500",
                                }}
                              >
                                Start:
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#e3f2fd",
                                  color: "#1976d2",
                                  padding: "2px 8px",
                                  borderRadius: "3px",
                                  fontSize: "12px",
                                }}
                              >
                                {formatDate(sprint.startDate)}
                              </span>
                            </div>
                          )}
                          {sprint.endDate && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#5e6c84",
                                  width: "48px",
                                  fontWeight: "500",
                                }}
                              >
                                End:
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#fff3e0",
                                  color: "#e65100",
                                  padding: "2px 8px",
                                  borderRadius: "3px",
                                  fontSize: "12px",
                                }}
                              >
                                {formatDate(sprint.endDate)}
                              </span>
                            </div>
                          )}
                          {sprint.completeDate && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#5e6c84",
                                  width: "48px",
                                  fontWeight: "500",
                                }}
                              >
                                Done:
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#e8f5e8",
                                  color: "#2e7d32",
                                  padding: "2px 8px",
                                  borderRadius: "3px",
                                  fontSize: "12px",
                                }}
                              >
                                {formatDate(sprint.completeDate)}
                              </span>
                            </div>
                          )}
                          {!sprint.startDate &&
                            !sprint.endDate &&
                            !sprint.completeDate && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#5e6c84",
                                  fontStyle: "italic",
                                }}
                              >
                                No dates set
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Goal */}
                      <td
                        style={{
                          border: "1px solid #dfe1e6",
                          padding: "16px 12px",
                          verticalAlign: "top",
                          maxWidth: "300px",
                        }}
                      >
                        {sprint.goal ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#172b4d",
                              backgroundColor: "#f4f5f7",
                              padding: "8px",
                              borderRadius: "4px",
                              lineHeight: "1.4",
                              maxHeight: "80px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={sprint.goal}
                          >
                            {sprint.goal}
                          </div>
                        ) : (
                          <span
                            style={{
                              color: "#5e6c84",
                              fontStyle: "italic",
                              fontSize: "12px",
                            }}
                          >
                            No goal set
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          border: "1px solid #dfe1e6",
                          padding: "16px 12px",
                          textAlign: "right",
                          verticalAlign: "top",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "12px",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSprintInJira(sprint.id);
                            }}
                            style={{
                              color: "#0052cc",
                              backgroundColor: "#e3f2fd",
                              border: "1px solid #bbdefb",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#1976d2";
                              e.currentTarget.style.color = "white";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#e3f2fd";
                              e.currentTarget.style.color = "#0052cc";
                            }}
                          >
                            Open in Jira
                          </button>
                          <span style={{ color: "#dfe1e6", fontSize: "16px" }}>
                            →
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-only" style={{ padding: "16px" }}>
              {sortSprints(sprints).map((sprint, index) => (
                <div
                  key={sprint.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "white" : "#f9fafb",
                    border: "1px solid #dfe1e6",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => openSprintInJira(sprint.id)}
                  onTouchStart={(e) => {
                    e.currentTarget.style.backgroundColor = "#e3f2fd";
                  }}
                  onTouchEnd={(e) => {
                    setTimeout(() => {
                      e.currentTarget.style.backgroundColor =
                        index % 2 === 0 ? "white" : "#f9fafb";
                    }, 150);
                  }}
                >
                  {/* Sprint Name & ID */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#172b4d",
                        marginBottom: "4px",
                        wordBreak: "break-word",
                      }}
                    >
                      {sprint.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#5e6c84",
                        backgroundColor: "#f4f5f7",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        display: "inline-block",
                      }}
                    >
                      ID: {sprint.id} • Board: {sprint.boardId}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#5e6c84",
                        marginBottom: "4px",
                      }}
                    >
                      Status
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        textTransform: "uppercase",
                        backgroundColor:
                          sprint.state === "active"
                            ? "#e8f5e8"
                            : sprint.state === "closed"
                            ? "#f4f5f7"
                            : "#e3f2fd",
                        color:
                          sprint.state === "active"
                            ? "#2e7d32"
                            : sprint.state === "closed"
                            ? "#5e6c84"
                            : "#1976d2",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          marginRight: "8px",
                          backgroundColor:
                            sprint.state === "active"
                              ? "#2e7d32"
                              : sprint.state === "closed"
                              ? "#5e6c84"
                              : "#1976d2",
                          animation:
                            sprint.state === "active"
                              ? "pulse 2s infinite"
                              : "none",
                        }}
                      ></div>
                      {sprint.state.charAt(0).toUpperCase() +
                        sprint.state.slice(1)}
                    </span>
                  </div>

                  {/* Dates */}
                  {(sprint.startDate ||
                    sprint.endDate ||
                    sprint.completeDate) && (
                    <div style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#5e6c84",
                          marginBottom: "4px",
                        }}
                      >
                        Dates
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {sprint.startDate && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{ fontSize: "11px", color: "#5e6c84" }}
                            >
                              Start:
                            </span>
                            <span
                              style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                fontSize: "11px",
                              }}
                            >
                              {formatDate(sprint.startDate)}
                            </span>
                          </div>
                        )}
                        {sprint.endDate && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{ fontSize: "11px", color: "#5e6c84" }}
                            >
                              End:
                            </span>
                            <span
                              style={{
                                backgroundColor: "#fff3e0",
                                color: "#e65100",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                fontSize: "11px",
                              }}
                            >
                              {formatDate(sprint.endDate)}
                            </span>
                          </div>
                        )}
                        {sprint.completeDate && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{ fontSize: "11px", color: "#5e6c84" }}
                            >
                              Done:
                            </span>
                            <span
                              style={{
                                backgroundColor: "#e8f5e8",
                                color: "#2e7d32",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                fontSize: "11px",
                              }}
                            >
                              {formatDate(sprint.completeDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Goal */}
                  {sprint.goal && (
                    <div style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#5e6c84",
                          marginBottom: "4px",
                        }}
                      >
                        Goal
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#172b4d",
                          backgroundColor: "#f4f5f7",
                          padding: "8px",
                          borderRadius: "4px",
                          lineHeight: "1.4",
                          wordBreak: "break-word",
                        }}
                      >
                        {sprint.goal}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSprintInJira(sprint.id);
                      }}
                      style={{
                        color: "#0052cc",
                        backgroundColor: "#e3f2fd",
                        border: "1px solid #bbdefb",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Open in Jira →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="desktop-only">
              <div
                style={{
                  padding: "16px 24px",
                  backgroundColor: "#f8f9fa",
                  borderTop: "1px solid #e9ecef",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                    color: "#5e6c84",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ fontWeight: "500" }}>
                    Showing {sprints.length} sprint
                    {sprints.length !== 1 ? "s" : ""}
                    {sprintName && ` matching "${sprintName}"`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#2e7d32",
                          animation: "pulse 2s infinite",
                        }}
                      ></div>
                      <span style={{ fontWeight: "500" }}>Active</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#5e6c84",
                        }}
                      ></div>
                      <span style={{ fontWeight: "500" }}>Closed</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#1976d2",
                        }}
                      ></div>
                      <span style={{ fontWeight: "500" }}>Future</span>
                    </div>
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
            <div
              style={{
                textAlign: "center",
                padding: "clamp(20px, 5vw, 40px) 16px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "clamp(16px, 5vw, 32px)",
                  maxWidth: "400px",
                  margin: "0 auto",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f4f5f7",
                    borderRadius: "50%",
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "40px",
                  }}
                >
                  📋
                </div>
                <h3
                  style={{
                    color: "#172b4d",
                    margin: "0 0 12px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  No Sprints Found
                </h3>
                <p
                  style={{
                    color: "#5e6c84",
                    margin: "0 0 20px 0",
                    fontSize: "14px",
                  }}
                >
                  Try searching with a different board ID or sprint name.
                </p>
                <button
                  onClick={() => {
                    setBoardId(DEFAULT_BOARD_ID.toString());
                    setSprintName("");
                    setApprovalFilter("all");
                    setGroupFilter("all");
                    setJiraStatusFilter("all");
                    setSortBy("newest");
                  }}
                  style={{
                    backgroundColor: "#0052cc",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
      </div>

      <style>{`
        :root {
          --mobile-hide: inline;
          --mobile-show: none;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        /* Responsive utilities */
        @media (max-width: 767px) {
          :root {
            --mobile-hide: none;
            --mobile-show: inline;
          }
          
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: block !important;
          }
          
          /* Force full width on mobile */
          .dashboard-container {
            width: 100vw !important;
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
          }
        }
        
        @media (min-width: 768px) {
          .desktop-only {
            display: block !important;
          }
          .mobile-only {
            display: none !important;
          }
        }
        
        /* Responsive text sizing */
        @media (max-width: 480px) {
          .responsive-text {
            font-size: 14px !important;
          }
          .responsive-padding {
            padding: 12px !important;
          }
        }
        
        /* Touch targets for mobile */
        @media (max-width: 768px) {
          button, .clickable {
            min-height: 44px;
            min-width: 44px;
          }
        }
        
        /* Mobile spacing adjustments */
        @media (max-width: 640px) {
          .mobile-spacing {
            padding: 12px !important;
            margin: 8px 0 !important;
          }
        }
        
        /* Ensure tables scroll properly */
        .table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Better responsive grid */
        .responsive-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
          gap: 16px;
          width: 100%;
        }
        
        @media (max-width: 640px) {
          .responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
