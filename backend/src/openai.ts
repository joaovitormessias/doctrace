import OpenAI from "openai";

// Janela de comunicacao com a openai
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
