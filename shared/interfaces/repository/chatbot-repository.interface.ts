import { IAIMessage } from "../../../modules/chatbot/chatbot.model";

export interface IChatBotRepository {
  getHistory(userId: string): Promise<IAIMessage[]>;
  getRecentMessage(userId: string, limit: number): Promise<IAIMessage[]>;
  appendMessagePair(
    userId: string,
    userMessage: IAIMessage,
    botMessage: IAIMessage,
  ): Promise<void>;
  clearHistory(userId: string): Promise<void>;
  deleteHistory(userId: string): Promise<void>;
}
