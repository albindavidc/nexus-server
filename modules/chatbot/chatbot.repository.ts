import { injectable } from "tsyringe";
import { IChatBotRepository } from "../../shared/interfaces/repository/chatbot-repository.interface";
import AIConversation, { IAIMessage } from "./chatbot.model";

@injectable()
export class ChatBotRepository implements IChatBotRepository {
  async getHistory(userId: string): Promise<IAIMessage[]> {
    const docs = await AIConversation.findOne({ user: userId }).lean();
    return docs?.messages ?? [];
  }

  async getRecentMessage(
    userId: string,
    limit: number = 10,
  ): Promise<IAIMessage[]> {
    const docs = await AIConversation.findOne(
      { user: userId },
      { messages: { $slice: -limit } },
    ).lean();

    return docs?.messages ?? [];
  }

  async appendMessagePair(
    userId: string,
    userMessage: IAIMessage,
    botMessage: IAIMessage,
  ): Promise<void> {
    await AIConversation.findOneAndUpdate(
      { user: userId },
      {
        $push: {
          messages: { $each: [userMessage, botMessage] },
        },
        $setOnInsert: { user: userId },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async clearHistory(userId: string): Promise<void> {
    await AIConversation.findOneAndUpdate(
      { user: userId },
      {
        $set: { messages: [] },
      },
    );
  }

  async deleteHistory(userId: string): Promise<void> {
    await AIConversation.deleteOne({ user: userId });
  }
}
