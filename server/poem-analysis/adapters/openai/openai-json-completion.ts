import type OpenAI from "openai";

/**
 * Port implementation: single JSON-object chat completion for poem analysis.
 */
export function createOpenAiJsonCompletion(openai: OpenAI, model: string) {
  return async function completeJson(input: {
    system: string;
    user: string;
  }): Promise<string | null> {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });
    return completion.choices[0]?.message?.content ?? null;
  };
}
