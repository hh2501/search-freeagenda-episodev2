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
 *   TARGET_SHEET_GID - (Optional) Sheet gid to read column A from. Must be the sheet
 *                      where column A contains ONLY search keyword candidates (not episode list).
 *   SKIP_ROWS        - (Optional) Number of rows to skip from top (e.g. 1 for header row). Default 0.
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
  const skipRows = props.getProperty("SKIP_ROWS");
  const skipRowsNum = skipRows != null && skipRows !== "" ? parseInt(skipRows, 10) : 0;

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
    skipRows: isNaN(skipRowsNum) || skipRowsNum < 0 ? 0 : skipRowsNum,
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

/** Values that are not search keywords (header/checkbox) - excluded from sync. */
const EXCLUDED_VALUES = { "true": true, "false": true, "title": true };

/**
 * Returns true if the cell value should be treated as a keyword (not a header or episode title).
 * @param {string} trimmed - Trimmed cell value
 * @returns {boolean}
 */
function isKeywordValue(trimmed) {
  if (EXCLUDED_VALUES[String(trimmed).toLowerCase()]) return false;
  if (trimmed.indexOf("#") === 0) return false; // e.g. "#1 エピソード名"
  return true;
}

/**
 * Reads column A from the target sheet, trims and deduplicates (order preserved).
 * Skips empty cells, header-like values ("true","false","title"), and values starting with "#".
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
  const skipRows = config.skipRows || 0;
  for (let i = 0; i < values.length; i++) {
    if (i < skipRows) continue;
    const raw = values[i][0];
    if (raw == null) continue;
    const trimmed = (typeof raw === "string" ? raw : String(raw)).trim();
    if (trimmed === "") continue;
    if (!isKeywordValue(trimmed)) continue;
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
 * Does nothing if no valid keywords are found (avoids overwriting with wrong sheet data).
 */
function syncSearchKeywords() {
  const config = getConfig();
  const keywords = getKeywordsFromSheet();
  if (keywords.length === 0) {
    return; // Do not overwrite repo when sheet has no valid keywords (e.g. wrong sheet)
  }
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
