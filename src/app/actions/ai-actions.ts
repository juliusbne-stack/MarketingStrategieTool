"use server";

import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Minimal OpenAI verification - confirms the AI SDK and OpenAI connection work.
 * Use this as a template for your AI features.
 */
export async function testOpenAI() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Reply with exactly: OpenAI connection OK",
  });

  return { success: true, text };
}
