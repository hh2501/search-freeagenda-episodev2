/**
 * Update transcript-checklist.json on GitHub: mark one episode as checked.
 * Used after saving transcript from the episode edit page.
 */

const GITHUB_API_BASE = "https://api.github.com";
const CHECKLIST_PATH = "public/transcript-checklist.json";
const COMMIT_MESSAGE = "chore: mark transcript checked for episode";

export interface ChecklistEpisode {
  episodeId: string;
  episodeNumber: string;
  title: string;
  publishedAt: string;
  checked: boolean;
  checkedAt: string | null;
}

export interface ChecklistJson {
  episodes: ChecklistEpisode[];
}

function getConfig(): {
  token: string;
  owner: string;
  repo: string;
  branch: string;
} | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) {
    return null;
  }
  const branch = process.env.GITHUB_BRANCH || "main";
  return { token, owner, repo, branch };
}

async function getCurrentFileFromGitHub(config: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}): Promise<{ sha: string | null; content: string }> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(CHECKLIST_PATH)}?ref=${encodeURIComponent(config.branch)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `token ${config.token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (response.status === 404) {
    return { sha: null, content: '{"episodes":[]}' };
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GET failed: ${response.status} ${text}`);
  }

  const body = (await response.json()) as { sha: string; content: string };
  const decoded = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { sha: body.sha, content: decoded.trim() };
}

/**
 * Mark the given episode as checked in public/transcript-checklist.json on GitHub.
 * Matches by episodeId first, then by title. Does nothing if env vars are missing or no match.
 *
 * @returns true if the checklist was updated and pushed; false if skipped or failed (logged).
 */
export async function updateChecklistChecked(
  episodeId: string,
  title: string
): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[transcript-checklist] GITHUB_TOKEN/OWNER/REPO not set, skipping checklist update");
    }
    return false;
  }

  try {
    const current = await getCurrentFileFromGitHub(config);
    let data: ChecklistJson;
    try {
      data = JSON.parse(current.content) as ChecklistJson;
    } catch {
      console.error("[transcript-checklist] Invalid JSON in checklist file");
      return false;
    }

    if (!Array.isArray(data.episodes)) {
      console.error("[transcript-checklist] checklist has no episodes array");
      return false;
    }

    const now = new Date().toISOString();
    const index = data.episodes.findIndex(
      (ep) =>
        ep.episodeId === episodeId || (ep.title && ep.title === title)
    );

    if (index === -1) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[transcript-checklist] No matching episode in checklist:", { episodeId, title });
      }
      return false;
    }

    const episode = data.episodes[index];
    episode.checked = true;
    episode.checkedAt = now;
    if (!episode.episodeId) {
      episode.episodeId = episodeId;
    }

    const jsonString = JSON.stringify(data, null, 2);
    const base64Content = Buffer.from(jsonString, "utf8").toString("base64");

    const putUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(CHECKLIST_PATH)}`;

    const putBody: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: COMMIT_MESSAGE,
      content: base64Content,
      branch: config.branch,
    };
    if (current.sha) {
      putBody.sha = current.sha;
    }

    const putResponse = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    if (putResponse.status !== 200 && putResponse.status !== 201) {
      const text = await putResponse.text();
      console.error("[transcript-checklist] GitHub PUT failed:", putResponse.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[transcript-checklist] updateChecklistChecked error:", error);
    return false;
  }
}
