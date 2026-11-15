import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { claudePromptModel } from "@/lib/ai/models";
import type { LabModel, QA, TestPhoto } from "./approaches";

/**
 * Real Claude for approaches (b)–(d). Only built when a human runs the experiment live
 * (`AI_MODE=live pnpm lab:experiment --photos <dir>`). The model asks and extracts;
 * it never invents facts: extraction copies only what the family wrote.
 */
export function liveLabModel(photosDir: string): LabModel {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = claudePromptModel();

  async function image(photo: TestPhoto) {
    const file = path.join(photosDir, `${photo.key}.jpg`);
    const data = (await readFile(file)).toString("base64");
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
    };
  }

  async function ask<T extends z.ZodType>(schema: T, content: Anthropic.ContentBlockParam[]) {
    const res = await client.messages.parse({
      model,
      max_tokens: 1000,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: zodOutputFormat(schema) },
    });
    if (res.parsed_output == null) throw new Error(`lab model stopped: ${res.stop_reason}`);
    return res.parsed_output as z.infer<T>;
  }

  const gentle =
    "Warm, plain words for a family member who is not technical. Never suggest adding people, objects or events that are not in the photo.";

  return {
    async photoQuestions(photo) {
      const out = await ask(z.object({ questions: z.array(z.string()).length(3) }), [
        await image(photo),
        {
          type: "text",
          text: `Look at this old family photo. Write exactly 3 short questions about what is visible, to help the family tell its story. ${gentle}`,
        },
      ]);
      return out.questions;
    },
    async agentTurn(photo, transcript: QA[]) {
      if (transcript.length >= 4) return null;
      const out = await ask(z.object({ question: z.string() }), [
        await image(photo),
        {
          type: "text",
          text: `You chat with a family member about this photo. Conversation so far: ${JSON.stringify(transcript)}. Ask ONE short next question (about people, place, sounds, or a message to them). ${gentle}`,
        },
      ]);
      return out.question;
    },
    async extractSheet(text) {
      return ask(
        z.object({
          place: z.string().optional(),
          when: z.string().optional(),
          soundOfPlace: z.string().optional(),
          message: z.string().optional(),
        }),
        [
          {
            type: "text",
            text: `From this text written by a family, copy out place, when, soundOfPlace and message ONLY if clearly stated. Never invent. Text: ${text}`,
          },
        ],
      );
    },
  };
}
