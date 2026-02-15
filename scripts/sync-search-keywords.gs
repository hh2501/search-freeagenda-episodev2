/**
 * Sync search keywords from Google Spreadsheet column A to
 * lib/search-keywords.json in the GitHub repository via GitHub API.
 *
 * Setup: Set script properties (File > Project properties > Script properties):
 *   GITHUB_TOKEN   - GitHub Personal Access Token (repo scope)
 *   GITHUB_OWNER   - Repository owner (user or org)
 *   GITHUB_REPO   - Repository name
 *   BRANCH        - Branch to update (e.g. main)
 *   SHEET_ID      - Spreadsheet ID (from URL)
 *   TARGET_SHEET_GID - (Optional) Sheet gid to read column A from (e.g. 1344358640)
 *
 * Run syncSearchKeywords() manually or set an onEdit trigger for the sheet.
 */

const GITHUB_API_BASE = "https://api.github.com";
const FILE_PATH = "lib/search-keywords.json";
const COMMIT_MESSAGE = "chore: sync search keywords from Google Sheet";

/**
 * Returns script configuration from Script Properties.
 * @returns {Object} Config object with token, owner, repo, branch, sheetId, sheetGid
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("GITHUB_TOKEN");
  const owner = props.getProperty("GITHUB_OWNER");
  const repo = props.getProperty("GITHUB_REPO");
  const branch = props.getProperty("BRANCH") || "main";
  const sheetId = props.getProperty("SHEET_ID");
  const sheetGid = props.getProperty("TARGET_SHEET_GID");

  if (!token || !owner || !repo || !sheetId) {
    throw new Error(
      "Missing required script properties: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, SHEET_ID"
    );
  }

  return {
    token: token,
    owner: owner,
    repo: repo,
    branch: branch,
    sheetId: sheetId,
    sheetGid: sheetGid ? parseInt(sheetGid, 10) : null,
  };
}

/**
 * Gets the sheet to read from (by gid or first sheet).
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {number|null} targetGid - Sheet gid or null for first sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getTargetSheet(spreadsheetId, targetGid) {
  const spread = SpreadsheetApp.openById(spreadsheetId);
  if (targetGid != null) {
    const sheets = spread.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === targetGid) {
        return sheets[i];
      }
    }
    throw new Error("Sheet with gid " + targetGid + " not found.");
  }
  return spread.getSheets()[0];
}

/**
 * Reads column A from the target sheet, trims and deduplicates (order preserved).
 * Empty cells are skipped.
 * @returns {string[]} Array of keyword strings
 */
function getKeywordsFromSheet() {
  const config = getConfig();
  const sheet = getTargetSheet(config.sheetId, config.sheetGid);
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return [];
  }
  const values = sheet.getRange(1, 1, lastRow, 1).getValues();
  const seen = {};
  const keywords = [];
  for (let i = 0; i < values.length; i++) {
    const raw = values[i][0];
    if (raw == null) continue;
    const trimmed = (typeof raw === "string" ? raw : String(raw)).trim();
    if (trimmed === "") continue;
    if (seen[trimmed]) continue;
    seen[trimmed] = true;
    keywords.push(trimmed);
  }
  return keywords;
}

/**
 * Fetches current file content and sha from GitHub.
 * @param {Object} config - Config from getConfig()
 * @returns {{ sha: string, content: string }}
 */
function getCurrentFileFromGitHub(config) {
  const url =
    GITHUB_API_BASE +
    "/repos/" +
    encodeURIComponent(config.owner) +
    "/" +
    encodeURIComponent(config.repo) +
    "/contents/" +
    encodeURIComponent(FILE_PATH) +
    "?ref=" +
    encodeURIComponent(config.branch);

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: "token " + config.token,
      Accept: "application/vnd.github.v3+json",
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() === 404) {
    return { sha: null, content: "[]" };
  }

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "GitHub GET failed: " +
        response.getResponseCode() +
        " " +
        response.getContentText()
    );
  }

  const body = JSON.parse(response.getContentText());
  const content = Utilities.newBlob(
    Utilities.base64Decode(body.content.replace(/\n/g, ""))
  )
    .getDataAsString()
    .trim();
  return { sha: body.sha, content: content };
}

/**
 * Updates lib/search-keywords.json on GitHub with the given keywords.
 * @param {string[]} keywords - Array of keyword strings
 * @param {Object} config - Config from getConfig()
 */
function putFileToGitHub(keywords, config) {
  const current = getCurrentFileFromGitHub(config);
  const jsonString = JSON.stringify(keywords);
  if (current.sha !== null && jsonString === current.content) {
    return; // No change, skip PUT to avoid unnecessary commit
  }

  const url =
    GITHUB_API_BASE +
    "/repos/" +
    encodeURIComponent(config.owner) +
    "/" +
    encodeURIComponent(config.repo) +
    "/contents/" +
    encodeURIComponent(FILE_PATH);

  const payload = {
    message: COMMIT_MESSAGE,
    content: Utilities.base64Encode(jsonString),
    branch: config.branch,
  };
  if (current.sha) {
    payload.sha = current.sha;
  }

  const response = UrlFetchApp.fetch(url, {
    method: "put",
    headers: {
      Authorization: "token " + config.token,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
    throw new Error(
      "GitHub PUT failed: " +
        response.getResponseCode() +
        " " +
        response.getContentText()
    );
  }
}

/**
 * Main entry: sync keywords from spreadsheet column A to GitHub.
 * Call this manually or from a trigger.
 */
function syncSearchKeywords() {
  const config = getConfig();
  const keywords = getKeywordsFromSheet();
  putFileToGitHub(keywords, config);
}

/**
 * Optional: onEdit trigger. Syncs only when column A is edited on the target sheet.
 * Set trigger: Edit > Current project's triggers > Add trigger >
 *   syncSearchKeywordsOnEdit, From spreadsheet, On edit
 */
function syncSearchKeywordsOnEdit(e) {
  if (!e || !e.range) return;
  if (e.range.getColumn() !== 1) return;

  const config = getConfig();
  if (config.sheetGid == null) return;
  if (e.range.getSheet().getSheetId() !== config.sheetGid) return;

  syncSearchKeywords();
}
