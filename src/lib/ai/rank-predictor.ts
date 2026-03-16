/**
 * Predictive SEO Engine
 * Uses statistical methods (linear regression, weighted moving average)
 * on keyword_ranks time-series data to forecast future positions.
 * When no rank history exists, uses AI to estimate realistic positions
 * based on the domain's authority and keyword relevance.
 */

import { aiChat } from "./ai-provider";

// --- Interfaces ---

export interface PredictionInput {
  keywordId: string;
  keyword: string;
  currentPosition: number | null;
  searchVolume: number | null;
  difficulty: number | null;
  rankHistory: Array<{ position: number | null; checked_at: string }>;
  serpFeatures: string[];
}

export interface PredictionResult {
  keywordId: string;
  keyword: string;
  currentPosition: number | null;
  predictedPosition: number;
  confidence: number; // 0-1
  direction: "improving" | "declining" | "stable";
  predictedFor: string; // ISO date
  featuresUsed: Record<string, number>;
  narrative: string;
}

// --- Math Helpers ---

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function linearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0 };

  const xMean = mean(xs);
  const yMean = mean(ys);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const ssRes = ys.reduce((sum, y, i) => {
    const predicted = slope * xs[i] + intercept;
    return sum + (y - predicted) ** 2;
  }, 0);
  const ssTot = ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

function weightedMovingAverage(values: number[], decayFactor: number = 0.9): number {
  if (values.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = decayFactor ** (values.length - 1 - i);
    weightedSum += values[i] * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : values[values.length - 1];
}

// --- AI Position Estimation ---

/**
 * Use AI to estimate current SERP positions for keywords when no rank data exists.
 * Returns a map of keyword → estimated position.
 */
export async function estimatePositionsWithAI(
  domain: string,
  keywords: Array<{ keyword: string; searchVolume: number | null; difficulty: number | null }>
): Promise<Map<string, { position: number; predicted7d: number; direction: string; confidence: number }>> {
  const result = new Map<string, { position: number; predicted7d: number; direction: string; confidence: number }>();

  const keywordList = keywords
    .slice(0, 30)
    .map((k) => {
      let line = `- "${k.keyword}"`;
      if (k.searchVolume != null) line += ` (volume: ${k.searchVolume})`;
      if (k.difficulty != null) line += ` (difficulty: ${k.difficulty}/100)`;
      return line;
    })
    .join("\n");

  try {
    const aiResult = await aiChat(
      `You are an expert SEO analyst. For the domain "${domain}", estimate the current Google search ranking position and predict how it will change in 7 days for each keyword below.

Consider:
- The domain's authority, brand recognition, and content relevance
- Keyword difficulty and search volume
- Whether the domain is a natural fit for the keyword topic
- A position of 1 means ranking #1 (best), 100+ means not ranking
- SEO is dynamic — even top-ranking sites have keywords with upward momentum (new content, seasonal trends, algorithm updates favoring them) and keywords at risk (increased competition, content aging, algorithm changes)

Domain: ${domain}
Keywords:
${keywordList}

Return ONLY a valid JSON object with this exact format (no markdown, no extra text):
{
  "keyword text here": { "position": 3, "predicted7d": 2, "direction": "improving", "confidence": 0.7 },
  ...
}

Rules:
- "position": realistic current Google position (1-100, or 100 if not ranking)
- "predicted7d": predicted position in 7 days (1-100)
- "direction": one of "improving", "declining", or "stable"
- "confidence": 0.3-0.8 (higher if domain is clearly relevant to keyword)
- Be realistic. ESPN ranks #1 for "ESPN live stream", but might be #30+ for "yoga classes"
- Brand keywords where the domain IS the brand should be position 1-3

CRITICAL DISTRIBUTION REQUIREMENT:
- You MUST provide a realistic MIX of directions. Not all keywords move the same way.
- At least 20% of keywords should be "improving" (e.g., content freshness gains, seasonal uptrend, less competition)
- At least 15% of keywords should be "declining" (e.g., increased competition, content aging, algorithm volatility)
- The rest can be "stable"
- For "improving": predicted7d must be at least 1 position better (lower number) than position
- For "declining": predicted7d must be at least 1 position worse (higher number) than position
- For "stable": predicted7d should be the same as position`,
      { temperature: 0.5, maxTokens: 3000, timeout: 60000 }
    );

    if (aiResult?.text) {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const [kw, data] of Object.entries(parsed)) {
          const d = data as { position?: number; predicted7d?: number; direction?: string; confidence?: number };
          if (d.position != null && d.predicted7d != null) {
            result.set(kw, {
              position: Math.max(1, Math.min(100, Math.round(d.position))),
              predicted7d: Math.max(1, Math.min(100, Math.round(d.predicted7d))),
              direction: d.direction ?? "stable",
              confidence: Math.max(0.2, Math.min(0.8, d.confidence ?? 0.5)),
            });
          }
        }
      }
    }
  } catch {
    // AI estimation failed — fall back to heuristic
  }

  return result;
}

// --- Main Prediction ---

function predictSingleKeyword(
  input: PredictionInput,
  horizonDays: number,
  aiEstimate?: { position: number; predicted7d: number; direction: string; confidence: number }
): Omit<PredictionResult, "narrative"> | null {
  const validHistory = input.rankHistory
    .filter((h) => h.position != null && h.position > 0)
    .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

  // Resolve current position: DB value > rank history > AI estimate > null
  const currentPos = input.currentPosition
    ?? (validHistory.length > 0 ? validHistory[validHistory.length - 1].position! : null)
    ?? aiEstimate?.position
    ?? null;

  if (currentPos == null) return null;

  const searchVolumeNorm = input.searchVolume ? Math.log10(input.searchVolume + 1) / 6 : 0.5;
  const difficultyNorm = (input.difficulty ?? 50) / 100;
  const dataPointCount = Math.max(1, validHistory.length);

  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + horizonDays);

  // --- AI-estimated path: use AI predictions when insufficient rank history ---
  if (validHistory.length < 3 && aiEstimate) {
    // Use the AI's own direction assessment — it accounts for context beyond raw numbers
    const aiDirection = aiEstimate.direction as "improving" | "declining" | "stable";
    const direction: "improving" | "declining" | "stable" =
      (aiDirection === "improving" || aiDirection === "declining" || aiDirection === "stable")
        ? aiDirection
        : "stable";

    // Use real DB position if available, but AI-predicted 7d target
    const effectiveCurrentPos = currentPos;
    // Ensure predicted7d reflects the AI direction relative to current position
    let predicted7d = aiEstimate.predicted7d;
    if (direction === "improving" && predicted7d >= effectiveCurrentPos) {
      predicted7d = Math.max(1, effectiveCurrentPos - Math.max(1, Math.round(effectiveCurrentPos * 0.05)));
    } else if (direction === "declining" && predicted7d <= effectiveCurrentPos) {
      predicted7d = Math.min(100, effectiveCurrentPos + Math.max(1, Math.round(effectiveCurrentPos * 0.05)));
    }

    return {
      keywordId: input.keywordId,
      keyword: input.keyword,
      currentPosition: effectiveCurrentPos,
      predictedPosition: predicted7d,
      confidence: aiEstimate.confidence,
      direction,
      predictedFor: predictedDate.toISOString(),
      featuresUsed: {
        velocity_7d: 0,
        velocity_30d: 0,
        volatility: 0,
        search_volume_norm: Math.round(searchVolumeNorm * 100) / 100,
        difficulty: Math.round(difficultyNorm * 100) / 100,
        serp_features: 0,
        data_points: 0,
        r_squared: 0,
        ai_estimated: 1,
      },
    };
  }

  // --- Fallback heuristic path (no AI available, no rank history) ---
  if (validHistory.length < 3) {
    // Even without AI, use heuristic direction based on difficulty + position
    // Keywords positioned worse than difficulty suggests have room to improve
    const difficultyPos = Math.round(difficultyNorm * 80 + 10); // rough expected position from difficulty
    let heuristicDirection: "improving" | "declining" | "stable" = "stable";
    let heuristicPredicted = currentPos;

    if (currentPos > difficultyPos + 10) {
      // Positioned much worse than difficulty suggests — opportunity
      heuristicDirection = "improving";
      heuristicPredicted = Math.max(1, currentPos - Math.max(1, Math.round((currentPos - difficultyPos) * 0.1)));
    } else if (currentPos < difficultyPos - 15) {
      // Positioned much better than difficulty suggests — at risk
      heuristicDirection = "declining";
      heuristicPredicted = Math.min(100, currentPos + Math.max(1, Math.round((difficultyPos - currentPos) * 0.08)));
    }

    return {
      keywordId: input.keywordId,
      keyword: input.keyword,
      currentPosition: currentPos,
      predictedPosition: heuristicPredicted,
      confidence: 0.25,
      direction: heuristicDirection,
      predictedFor: predictedDate.toISOString(),
      featuresUsed: {
        velocity_7d: 0,
        velocity_30d: 0,
        volatility: 0,
        search_volume_norm: Math.round(searchVolumeNorm * 100) / 100,
        difficulty: Math.round(difficultyNorm * 100) / 100,
        serp_features: 0,
        data_points: 0,
        r_squared: 0,
        ai_estimated: 0,
      },
    };
  }

  // --- Full prediction path: 3+ data points ---
  const positions = validHistory.map((h) => h.position!);
  const timestamps = validHistory.map((h) => new Date(h.checked_at).getTime());

  const t0 = timestamps[0];
  const daysSeries = timestamps.map((t) => (t - t0) / (1000 * 60 * 60 * 24));
  const currentDays = daysSeries[daysSeries.length - 1];

  const regression = linearRegression(daysSeries, positions);

  const now = Date.now();
  const recent7 = validHistory.filter(
    (h) => now - new Date(h.checked_at).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  const recent30 = validHistory.filter(
    (h) => now - new Date(h.checked_at).getTime() < 30 * 24 * 60 * 60 * 1000
  );

  const velocity7d =
    recent7.length >= 2
      ? (recent7[recent7.length - 1].position! - recent7[0].position!) / recent7.length
      : 0;

  const velocity30d =
    recent30.length >= 2
      ? (recent30[recent30.length - 1].position! - recent30[0].position!) / recent30.length
      : 0;

  const wma = weightedMovingAverage(positions, 0.85);
  const volatility = stddev(positions);

  const features: Record<string, number> = {
    velocity_7d: Math.round(velocity7d * 100) / 100,
    velocity_30d: Math.round(velocity30d * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    search_volume_norm: Math.round(searchVolumeNorm * 100) / 100,
    difficulty: Math.round(difficultyNorm * 100) / 100,
    serp_features: input.serpFeatures?.length ?? 0,
    data_points: dataPointCount,
    r_squared: Math.round(regression.rSquared * 100) / 100,
    ai_estimated: 0,
  };

  const regressionPrediction = regression.slope * (currentDays + horizonDays) + regression.intercept;
  const wmaPrediction = wma + regression.slope * horizonDays;

  const rWeight = Math.max(0.3, Math.min(0.7, regression.rSquared));
  const blendedPrediction = rWeight * regressionPrediction + (1 - rWeight) * wmaPrediction;

  const predictedPosition = Math.max(1, Math.min(100, Math.round(blendedPrediction)));

  let confidence = 0.5;
  confidence += Math.min(0.2, dataPointCount / 50);
  confidence += regression.rSquared * 0.2;
  confidence += Math.max(0, 0.1 - volatility / 100);
  confidence = Math.max(0.1, Math.min(0.95, confidence));
  confidence = Math.round(confidence * 100) / 100;

  const diff = predictedPosition - currentPos;
  const direction: "improving" | "declining" | "stable" =
    diff <= -2 ? "improving" : diff >= 2 ? "declining" : "stable";

  return {
    keywordId: input.keywordId,
    keyword: input.keyword,
    currentPosition: currentPos,
    predictedPosition,
    confidence,
    direction,
    predictedFor: predictedDate.toISOString(),
    featuresUsed: features,
  };
}

/**
 * Generate predictions for multiple keywords.
 * Uses AI estimation when no rank history exists, plus AI-enhanced narratives.
 */
export async function predictKeywordRanks(
  inputs: PredictionInput[],
  horizonDays: number = 7,
  domain?: string
): Promise<PredictionResult[]> {
  // Check if we need AI estimation (fewer than 3 rank history data points)
  const needsAIEstimation = inputs.filter(
    (i) => i.rankHistory.filter((h) => h.position != null).length < 3
  );

  let aiEstimates = new Map<string, { position: number; predicted7d: number; direction: string; confidence: number }>();

  // Use AI to estimate direction/predictions if domain is provided and keywords need estimation
  if (domain && needsAIEstimation.length > 0) {
    aiEstimates = await estimatePositionsWithAI(
      domain,
      needsAIEstimation.map((i) => ({
        keyword: i.keyword,
        searchVolume: i.searchVolume,
        difficulty: i.difficulty,
      }))
    );
  }

  // Run predictions with AI estimates
  const predictions: Omit<PredictionResult, "narrative">[] = [];
  for (const input of inputs) {
    const aiEst = aiEstimates.get(input.keyword);
    const result = predictSingleKeyword(input, horizonDays, aiEst);
    if (result) predictions.push(result);
  }

  if (predictions.length === 0) return [];

  // Generate AI narratives in batch
  const summaryLines = predictions
    .slice(0, 20)
    .map(
      (p) =>
        `"${p.keyword}": position ${p.currentPosition ?? "?"} → ${p.predictedPosition} (${p.direction}, confidence ${(p.confidence * 100).toFixed(0)}%)`
    )
    .join("\n");

  let narratives: Record<string, string> = {};
  try {
    const aiResult = await aiChat(
      `You are an SEO analyst. For each keyword prediction below, write a brief 1-sentence narrative explaining WHY the rank is predicted to move that way. Be specific and actionable.

${summaryLines}

Return ONLY a JSON object where keys are exact keyword strings and values are the narrative sentences. No extra text.`,
      { temperature: 0.5, maxTokens: 2048 }
    );

    if (aiResult?.text) {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        narratives = JSON.parse(jsonMatch[0]);
      }
    }
  } catch {
    // Fallback to generic narratives
  }

  return predictions.map((p) => ({
    ...p,
    narrative:
      narratives[p.keyword] ??
      (p.direction === "improving"
        ? `${p.keyword} shows upward momentum and is predicted to improve from position ${p.currentPosition} to ${p.predictedPosition}.`
        : p.direction === "declining"
          ? `${p.keyword} shows signs of rank decline and may drop from position ${p.currentPosition} to ${p.predictedPosition}.`
          : `${p.keyword} is expected to remain stable around position ${p.currentPosition}.`),
  }));
}
