/**
 * POST /api/scan-page
 *
 * Receives a photo of one physical album page (JPEG/PNG, max 4 MB).
 * Calls Gemini 2.5 Flash to detect which sticker slots are filled vs empty.
 * Returns structured JSON detections for the client to review + apply.
 *
 * Runtime: Node (not Edge) — uses Buffer.from() + no edge-incompatible APIs.
 *
 * Fields:
 *   image       (required) — binary file field in multipart/form-data
 *   team_code   (optional) — hint like "ARG" for accuracy
 *   expected_grid (optional) — "4x4" | "4x5" — default "4x4"
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanDetection {
  slot: number;
  filled: boolean;
  confidence: number;
}

export interface ScanPageResponse {
  team_code: string | null;
  grid: { cols: number; rows: number };
  detections: ScanDetection[];
}

// Gemini raw response shape (we extract the JSON from text)
interface GeminiCandidate {
  content: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const GEMINI_MODEL = "gemini-2.0-flash-exp"; // primary; fallback path below
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check API key early
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "gemini_not_configured", message: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "Could not parse multipart form" },
      { status: 400 }
    );
  }

  // 3. Extract and validate image
  const imageFile = formData.get("image");
  if (!imageFile || typeof imageFile === "string") {
    return NextResponse.json(
      { error: "missing_image", message: "Field 'image' is required" },
      { status: 400 }
    );
  }

  const file = imageFile as File;

  // MIME check
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        error: "invalid_mime",
        message: `Unsupported image type: ${file.type}. Use JPEG, PNG, or WebP.`,
      },
      { status: 400 }
    );
  }

  // Size check
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      {
        error: "image_too_large",
        message: `Image exceeds 4 MB limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB sent)`,
      },
      { status: 400 }
    );
  }

  // 4. Optional params
  const teamCodeHint = (formData.get("team_code") as string | null) ?? null;
  const gridHint = (formData.get("expected_grid") as string | null) ?? "4x4";

  // Parse grid dimensions
  const [colsStr, rowsStr] = gridHint.split("x");
  const cols = parseInt(colsStr ?? "4", 10) || 4;
  const rows = parseInt(rowsStr ?? "4", 10) || 4;
  const totalSlots = cols * rows;

  // 5. Build base64 payload
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "image/jpeg";

  // 6. Build Gemini prompt
  const teamHintText = teamCodeHint
    ? `The album page belongs to team "${teamCodeHint}" — prefer this if visible.`
    : "Identify the team from the visible flag, badge, or country name.";

  const prompt = `You are analyzing a page from the Panini FIFA World Cup 2026 sticker album.
This page is laid out as a ${gridHint} grid of sticker slots (${totalSlots} total slots).
Each slot either has a real sticker pasted in (filled = true) or is empty showing the slot template/outline (filled = false).

${teamHintText}

For each slot from left-to-right, top-to-bottom (slot 1 = top-left, slot ${totalSlots} = bottom-right), determine if it is filled.

Return STRICTLY valid JSON in this exact shape with no markdown fences, no commentary:
{
  "team_code": "MEX",
  "grid": { "cols": ${cols}, "rows": ${rows} },
  "detections": [
    { "slot": 1, "filled": true, "confidence": 0.95 },
    { "slot": 2, "filled": false, "confidence": 0.9 }
  ]
}

Rules:
- team_code must be the 3-letter FIFA code (ARG, BRA, MEX, etc.) or null if unclear.
- confidence is a float 0.0–1.0 for your certainty that the slot is filled or empty.
- If you cannot see a slot clearly, set confidence below 0.7.
- Return exactly ${totalSlots} detection entries, one per slot.`;

  // 7. Call Gemini — try primary model, fall back to secondary
  let geminiData: GeminiResponse | null = null;
  const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];
  let lastError = "";

  for (const model of modelsToTry) {
    const url = GEMINI_API_URL.replace("{model}", model) + `?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      const raw = await res.json() as GeminiResponse;

      if (!res.ok || raw.error) {
        lastError = raw.error?.message ?? `HTTP ${res.status}`;
        continue;
      }

      geminiData = raw;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch_failed";
    }
  }

  if (!geminiData) {
    return NextResponse.json(
      { error: "gemini_failed", message: lastError || "Gemini API unavailable" },
      { status: 500 }
    );
  }

  // 8. Parse Gemini response
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: ScanPageResponse;
  try {
    // Strip markdown fences if model ignores responseMimeType
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(jsonStr) as ScanPageResponse;
  } catch {
    return NextResponse.json(
      {
        error: "parse_failed",
        message: "Gemini returned non-JSON response",
        raw: rawText.slice(0, 400),
      },
      { status: 500 }
    );
  }

  // 9. Validate schema minimally
  if (!Array.isArray(parsed.detections) || parsed.detections.length === 0) {
    return NextResponse.json(
      { error: "invalid_response", message: "Gemini response missing detections array" },
      { status: 500 }
    );
  }

  // Override team_code hint if provided and model didn't pick it up
  if (teamCodeHint && !parsed.team_code) {
    parsed.team_code = teamCodeHint;
  }

  return NextResponse.json(parsed, { status: 200 });
}

// Ensure Node runtime (not Edge) — Buffer is needed for base64 encoding
export const runtime = "nodejs";
