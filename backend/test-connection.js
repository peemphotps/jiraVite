#!/usr/bin/env node

// Simple test script to verify Jira API connection
const axios = require("axios");
require("dotenv").config();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

console.log("🔧 Testing Jira API Connection...");
console.log(`📍 Jira Base URL: ${JIRA_BASE_URL}`);
console.log(`📧 Jira Email: ${JIRA_EMAIL}`);
console.log(
  `🔑 API Token Length: ${
    JIRA_API_TOKEN ? JIRA_API_TOKEN.length : "undefined"
  } characters`
);

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("❌ ERROR: Missing Jira credentials");
  console.log(
    "Please ensure JIRA_EMAIL and JIRA_API_TOKEN are set in .env file"
  );
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

async function testConnection() {
  try {
    console.log("\n🧪 Testing Jira API connection...");

    const response = await axios.get(`${JIRA_BASE_URL}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    console.log("✅ SUCCESS: Connected to Jira!");
    console.log(
      `👤 User: ${response.data.displayName} (${response.data.emailAddress})`
    );
    console.log(`🏢 Account Type: ${response.data.accountType}`);

    // Test a simple JQL query
    console.log("\n🔍 Testing JQL query...");
    const searchResponse = await axios.get(
      `${JIRA_BASE_URL}/rest/api/3/search`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
        params: {
          jql: "project = POSC ORDER BY created DESC",
          maxResults: 1,
          fields: "summary,status",
        },
      }
    );

    console.log(
      `✅ JQL Query successful: Found ${searchResponse.data.total} total issues`
    );
    if (searchResponse.data.issues.length > 0) {
      const firstIssue = searchResponse.data.issues[0];
      console.log(
        `📝 Sample issue: ${firstIssue.key} - ${firstIssue.fields.summary}`
      );
    }
  } catch (error) {
    console.error("❌ ERROR: Failed to connect to Jira");

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(
        `Message: ${
          error.response.data?.errorMessages?.[0] || error.response.statusText
        }`
      );

      if (error.response.status === 401) {
        console.log("\n💡 Troubleshooting tips:");
        console.log("1. Check your JIRA_EMAIL is correct");
        console.log("2. Verify your JIRA_API_TOKEN is valid");
        console.log("3. Make sure the API token has the right permissions");
        console.log(
          "4. Generate a new API token at: https://id.atlassian.com/manage-profile/security/api-tokens"
        );
      }
    } else {
      console.error(`Network Error: ${error.message}`);
    }
  }
}

testConnection();
