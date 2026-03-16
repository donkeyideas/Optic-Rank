/**
 * Microsoft Teams integration via incoming webhooks.
 * Users provide their own Teams webhook URL in Settings.
 * Uses Adaptive Card format for rich notifications.
 */

export interface TeamsMessage {
  type: "rank_change" | "audit_alert" | "prediction_update" | "new_backlink" | "lost_backlink" | "test";
  title: string;
  details: Record<string, string | number>;
  projectName?: string;
  url?: string;
}

/**
 * Send a message to a Microsoft Teams webhook URL using Adaptive Cards.
 */
export async function sendTeamsNotification(
  webhookUrl: string,
  message: TeamsMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const card = buildAdaptiveCard(message);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { success: false, error: `Teams responded with ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send Teams notification",
    };
  }
}

const typeColor: Record<TeamsMessage["type"], string> = {
  rank_change: "attention",
  audit_alert: "warning",
  prediction_update: "accent",
  new_backlink: "good",
  lost_backlink: "attention",
  test: "default",
};

function buildAdaptiveCard(message: TeamsMessage) {
  const facts = Object.entries(message.details).map(([key, value]) => ({
    title: key,
    value: String(value),
  }));

  const body: unknown[] = [
    {
      type: "TextBlock",
      size: "medium",
      weight: "bolder",
      text: message.title,
      color: typeColor[message.type] ?? "default",
    },
  ];

  if (message.projectName) {
    body.push({
      type: "TextBlock",
      text: `Project: ${message.projectName}`,
      isSubtle: true,
      spacing: "none",
    });
  }

  if (facts.length > 0) {
    body.push({
      type: "FactSet",
      facts,
      separator: true,
    });
  }

  const actions: unknown[] = [];
  if (message.url) {
    actions.push({
      type: "Action.OpenUrl",
      title: "View in Optic Rank",
      url: message.url,
    });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
          ...(actions.length > 0 ? { actions } : {}),
        },
      },
    ],
  };
}
