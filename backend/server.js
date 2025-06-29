const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Jira API configuration
const JIRA_BASE_URL =
  process.env.JIRA_BASE_URL || "https://linemanwongnai.atlassian.net";
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Helper function to create Jira API headers
const getJiraHeaders = () => {
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error(
      "Jira credentials not configured. Please set JIRA_EMAIL and JIRA_API_TOKEN in .env file"
    );
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    "base64"
  );
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Get Jira issues based on JQL query
app.get("/api/jira-issues", async (req, res) => {
  try {
    const { jql = "project = POSC AND Sprint = 5526 ORDER BY created DESC" } =
      req.query;

    console.log(`Fetching issues with JQL: ${jql}`);

    const response = await axios.get(`${JIRA_BASE_URL}/rest/api/3/search`, {
      headers: getJiraHeaders(),
      params: {
        jql,
        fields: [
          "summary",
          "status",
          "priority",
          "assignee",
          "reporter",
          "created",
          "updated",
          "labels",
          "issuetype",
          "description",
          "sprint",
          "customfield_10020", // Common sprint field
          "customfield_10010", // Another common sprint field
          "customfield_10014", // Yet another common sprint field
        ].join(","),
        maxResults: 1000,
        expand: "names",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error fetching Jira issues:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch issues",
      message: error.response?.data?.errorMessages?.[0] || error.message,
      details: error.response?.data || null,
    });
  }
});

// Get field information to help identify sprint fields
app.get("/api/jira-fields", async (req, res) => {
  try {
    console.log("Fetching Jira field information...");

    const response = await axios.get(`${JIRA_BASE_URL}/rest/api/3/field`, {
      headers: getJiraHeaders(),
    });

    // Filter for sprint-related fields
    const sprintFields = response.data.filter(
      (field) =>
        field.name.toLowerCase().includes("sprint") ||
        field.id.includes("sprint") ||
        field.schema?.customId === "com.pyxis.greenhopper.jira:gh-sprint"
    );

    res.json({
      sprintFields,
      allFieldsCount: response.data.length,
    });
  } catch (error) {
    console.error(
      "Error fetching Jira fields:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch fields",
      message: error.response?.data?.errorMessages?.[0] || error.message,
      details: error.response?.data || null,
    });
  }
});

// Get Jira sprints by board ID
app.get("/api/jira-sprints", async (req, res) => {
  try {
    const { boardId, sprintName } = req.query;

    if (!boardId) {
      return res.status(400).json({
        error: "Board ID is required",
        message: "Please provide a boardId parameter",
      });
    }

    console.log(
      `Fetching sprints for board ${boardId}${
        sprintName ? ` with name filter: ${sprintName}` : ""
      }`
    );

    const response = await axios.get(
      `${JIRA_BASE_URL}/rest/agile/1.0/board/${boardId}/sprint`,
      {
        headers: getJiraHeaders(),
        params: {
          maxResults: 1000,
          ...(sprintName && { sprint: sprintName }),
        },
      }
    );

    let sprints = response.data.values || [];

    // Filter by sprint name if provided (case-insensitive)
    if (sprintName) {
      const nameFilter = sprintName.toLowerCase();
      sprints = sprints.filter((sprint) =>
        sprint.name.toLowerCase().includes(nameFilter)
      );
    }

    res.json({
      ...response.data,
      values: sprints,
    });
  } catch (error) {
    console.error(
      "Error fetching Jira sprints:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch sprints",
      message: error.response?.data?.errorMessages?.[0] || error.message,
      details: error.response?.data || null,
    });
  }
});

// Get specific sprint by ID
app.get("/api/sprint/:sprintId", async (req, res) => {
  try {
    const { sprintId } = req.params;

    console.log(`Fetching sprint details for sprint ${sprintId}`);

    const response = await axios.get(
      `${JIRA_BASE_URL}/rest/agile/1.0/sprint/${sprintId}`,
      {
        headers: getJiraHeaders(),
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      "Error fetching sprint details:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch sprint details",
      message: error.response?.data?.errorMessages?.[0] || error.message,
      details: error.response?.data || null,
    });
  }
});

// Get field information to help identify sprint fields
app.get("/api/jira-fields", async (req, res) => {
  try {
    console.log("Fetching Jira field information...");

    const response = await axios.get(`${JIRA_BASE_URL}/rest/api/3/field`, {
      headers: getJiraHeaders(),
    });

    // Filter for sprint-related fields
    const sprintFields = response.data.filter(
      (field) =>
        field.name.toLowerCase().includes("sprint") ||
        field.id.includes("sprint") ||
        field.schema?.customId === "com.pyxis.greenhopper.jira:gh-sprint"
    );

    res.json({
      sprintFields,
      allFieldsCount: response.data.length,
    });
  } catch (error) {
    console.error(
      "Error fetching Jira fields:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch fields",
      message: error.response?.data?.errorMessages?.[0] || error.message,
      details: error.response?.data || null,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `🚀 Jira Integration API server running on http://localhost:${PORT}`
  );
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);

  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.warn(
      "⚠️  WARNING: Jira credentials not configured. Please set JIRA_EMAIL and JIRA_API_TOKEN in .env file"
    );
  }
});
