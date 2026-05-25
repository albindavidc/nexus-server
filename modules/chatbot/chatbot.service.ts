import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { IChatBotService } from "../../shared/interfaces/services/chatbot-service.inteface";
import AppError from "../../shared/errors/AppError";
import { inject, injectable } from "tsyringe";
import {
  IBulkChatRequestDto,
  IBulkChatResponseDto,
  IBulkChatResult,
  IChatBotRequestDto,
  IChatBotResponseDto,
} from "../../shared/types/chatbot.types";
import logger from "../../shared/utils/logger";
import { TOKENS } from "../../shared/di/tokens";
import { IChatBotRepository } from "../../shared/interfaces/repository/chatbot-repository.interface";
import { IAIMessage } from "./chatbot.model";

const MODEL = "gemini-2.5-flash";
const SYSTEM_PROMPT = `You are Nexus Coach, an expert AI fitness assistant
embedded in the Nexus calisthenics community app.
- Give precise, science-backed calisthenics and bodyweight training advice
- Help users plan workouts, track progress, and overcome plateaus
- Explain exercise form, progressions, and modifications
- Motivate and coach users in a friendly, energetic tone
- Keep responses concise and actionable — prefer bullet points and clear steps
- When asked about non-fitness topics, gently steer back to fitness
You never diagnose medical conditions. Always recommend a doctor for injuries.
Always respond in the same language the user writes in.`;

const BULK_CONCURRENCY = 5;

@injectable()
export class ChatBotService implements IChatBotService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @inject(TOKENS.ChatBotRepository)
    private readonly chatBotRepository: IChatBotRepository,
  ) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new AppError("Google API Key is required", 404);
    }

    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  async chat(
    userId: string,
    dto: IChatBotRequestDto,
  ): Promise<IChatBotResponseDto> {
    try {
      const dbHistory = await this.chatBotRepository.getHistory(userId);

      const model = this.getModel();
      const history = this.buildHistory(dbHistory);
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(dto.message);
      const reply = result.response.text();

      await this.chatBotRepository.appendMessagePair(
        userId,
        { role: "user", content: dto.message, createdAt: new Date() },
        { role: "assistant", content: reply, createdAt: new Date() },
      );

      logger.info(`ChatBot ${userId}: ${reply}`);
      return { reply };
    } catch (error) {
      logger.error("Nexus Chatbot Error: ", error);
      throw new AppError("Failed to get response from AI", 500);
    }
  }

  async chatStream(
    userId: string,
    dto: IChatBotRequestDto,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): Promise<void> {
    try {
      const dbHistory = await this.chatBotRepository.getHistory(userId);

      const model = this.getModel();
      const history = this.buildHistory(dbHistory);
      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(dto.message);

      let fullReply = "";
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullReply += text;
          onChunk(text);
        }
      }

      await this.chatBotRepository.appendMessagePair(
        userId,
        { role: "user", content: dto.message, createdAt: new Date() },
        { role: "assistant", content: fullReply, createdAt: new Date() },
      );

      logger.debug(`ChatBot streaming complete ${userId}: ${dto.message}`);
      onDone();
    } catch (error) {
      logger.error(`ChatBot streaming error ${userId}: `, error);
      onError(error as Error);
    }
  }

  async bulkChat(
    userId: string,
    dto: IBulkChatRequestDto,
  ): Promise<IBulkChatResponseDto> {
    const { items } = dto;
    logger.debug(
      `Bulk chat request for user ${userId} with ${items.length} items`,
    );

    const result: IBulkChatResult[] = [];

    for (let i = 0; i < items.length; i += BULK_CONCURRENCY) {
      const batch = items.slice(i, i + BULK_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((item) =>
          this.chat(userId, {
            message: item.message,
            history: item.history,
          })
            .catch(() => ({
              reply: "Failed to generate reply",
              tokensUsed: undefined,
            }))
            .then((chatResult) => ({
              id: item.id,
              ...chatResult,
            })),
        ),
      );

      settled.forEach((outcome, idx) => {
        const itemId = batch[idx].id;

        if (outcome.status === "fulfilled") {
          result.push({
            id: itemId,
            reply: outcome.value.reply,
            tokensUsed: outcome.value.tokensUsed,
          });
        } else {
          logger.error(`Bulk chat failed for item ${itemId}: `, outcome.reason);
          result.push({
            id: itemId,
            error: "Failed to generate reply",
          });
        }
      });
    }

    const totalTokensUsed = result.reduce(
      (sum, curr) => sum + (curr.tokensUsed || 0),
      0,
    );
    const successCount = result.filter((r) => !r.error).length;
    const errorCount = result.filter((r) => r.error).length;

    logger.debug(
      `Bulk chat completed for user ${userId}: ${successCount}/${result.length} successful`,
    );

    return {
      results: result,
      totalTokensUsed,
      totalItems: result.length,
      successCount,
      errorCount,
    };
  }

  async getHistory(userId: string): Promise<IAIMessage[]> {
    return this.chatBotRepository.getHistory(userId);
  }

  async clearHistory(userId: string): Promise<void> {
    await this.chatBotRepository.clearHistory(userId);
  }

  private getModel() {
    return this.genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  private buildHistory(messages: IAIMessage[]) {
    return messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  }
}
