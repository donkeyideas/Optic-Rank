/**
 * Slack integration via incoming webhooks.
 * Users provide their own Slack webhook URL in Settings.
 */

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string }>;
}

/**
 * Send a message to a Slack webhook URL.
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const blocks = buildBlocks(message);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { success: false, error: `Slack responded with ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send Slack notification",
    };
  }
}

export interface SlackMessage {
  type: "rank_change" | "audit_alert" | "prediction_update" | "new_backlink" | "lost_backlink" | "test";
  title: string;
  details: Record<string, string | number>;
  projectName?: string;
  url?: string;
}

function buildBlocks(message: SlackMessage): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: message.title, emoji: true },
  });

  // Project context
  if (message.projectName) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `*Project:* ${message.projectName}` }],
    });
  }

  // Details as fields
  const fields = Object.entries(message.details).map(([key, value]) => ({
    type: "mrkdwn" as const,
    text: `*${key}:*\n${value}`,
  }));

  if (fields.length > 0) {
    blocks.push({ type: "section", fields });
  }

  // Optional action link
  if (message.url) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${message.url}|View in Optic Rank>`,
      },
    });
  }

  // Divider
  blocks.push({ type: "divider" });

  // Footer
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Sent from Optic Rank" }],
  });

  return blocks;
}
