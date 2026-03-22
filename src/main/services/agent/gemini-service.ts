type GeminiGenerateInput = {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
  model?: string;
};

type GeminiGenerateResult = {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const generateWithGemini = async (
  input: GeminiGenerateInput
): Promise<GeminiGenerateResult> => {
  const model = input.model?.trim() || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      input.apiKey
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: input.systemInstruction
          ? {
              role: "system",
              parts: [{ text: input.systemInstruction }]
            }
          : undefined,
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 900
        }
      })
    }
  );

  const payload = (await response.json()) as {
    error?: {
      message?: string;
    };
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini istegi basarisiz oldu.");
  }

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Gemini bos cevap dondurdu.");
  }

  return {
    text,
    model,
    tokensIn: payload.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: payload.usageMetadata?.candidatesTokenCount ?? 0
  };
};
