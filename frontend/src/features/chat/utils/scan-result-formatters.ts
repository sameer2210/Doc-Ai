/**
 * Presentation-layer formatters for scan results.
 * Converts internal ML labels into professional, human-readable text.
 */

/**
 * Converts snake_case / UPPER_CASE ML prediction labels to human-readable form.
 * e.g. "Immature_Cataract" → "Immature Cataract"
 *      "IOL_Inserted"      → "IOL Inserted"
 *      "no_cataract"       → "No Cataract"
 */
export function formatPredictionLabel(prediction: string): string {
  return prediction
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maps confidence ranges to professional clinical labels.
 */
export type ConfidenceLevel = 'high' | 'moderate' | 'limited';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'moderate';
  return 'limited';
}

export function formatConfidenceLabel(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'High Confidence';
    case 'moderate':
      return 'Moderate Confidence';
    case 'limited':
      return 'Limited Confidence';
  }
}

/**
 * Returns a professional clinical note based on confidence level.
 */
export function getClinicalNote(confidence: number, prediction: string): string {
  const level = getConfidenceLevel(confidence);
  const isNormal =
    prediction.toLowerCase().includes('normal') ||
    prediction.toLowerCase().includes('no cataract');

  if (isNormal) {
    return level === 'limited'
      ? 'No signs of cataract were detected, however the scan confidence is limited. A follow-up examination is recommended.'
      : 'No significant signs of cataract were detected in this scan. Continue with routine eye care.';
  }

  switch (level) {
    case 'high':
      return 'This scan shows a clear indication that warrants professional ophthalmological evaluation.';
    case 'moderate':
      return 'This scan suggests a potential finding. A professional eye examination is recommended for confirmation.';
    case 'limited':
      return 'This result has limited confidence and should be verified through a professional eye examination.';
  }
}

/**
 * Detects whether a message is a backend-generated scan result prompt
 * and extracts prediction + confidence if so.
 *
 * This is used to render scan-result cards for messages loaded from history
 * (where the frontend didn't tag them at creation time).
 */
export function parseScanResultFromContent(
  content: string,
): { prediction: string; confidence: number } | null {
  // Pattern 1 — normal consultation prompt:
  // "...Result: Immature_Cataract (46% confidence)..."
  const resultMatch = content.match(
    /Result:\s*(.+?)\s*\((\d+)%\s*confidence\)/i,
  );
  if (resultMatch) {
    return {
      prediction: resultMatch[1].trim(),
      confidence: parseInt(resultMatch[2], 10) / 100,
    };
  }

  // Pattern 2 — limit-exceeded compact form:
  // "Analyze scan: Immature_Cataract (Confidence: 46%)"
  const analyzeMatch = content.match(
    /Analyze scan:\s*(.+?)\s*\(Confidence:\s*(\d+)%\)/i,
  );
  if (analyzeMatch) {
    return {
      prediction: analyzeMatch[1].trim(),
      confidence: parseInt(analyzeMatch[2], 10) / 100,
    };
  }

  return null;
}

export function parseStructuredScanUserMessage(
  content: string,
): { prediction: string; confidence: number } | null {
  if (!content || !content.toLowerCase().includes('eye scan result')) {
    return null;
  }

  const conditionMatch = content.match(/Detected Condition:\s*([^\n]+)/i);
  const confidenceMatch = content.match(/AI Confidence:\s*(\d+(?:\.\d+)?)%/i);

  if (!conditionMatch || !confidenceMatch) {
    return null;
  }

  const confidencePercentage = Number(confidenceMatch[1]);
  if (!Number.isFinite(confidencePercentage)) {
    return null;
  }

  return {
    prediction: conditionMatch[1].trim(),
    confidence: confidencePercentage / 100,
  };
}
