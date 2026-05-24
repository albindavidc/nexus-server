import { IConversation } from "../../../modules/chat/conversation.model";
import { IMessage } from "../../../modules/chat/message.model";

export interface IChatRepository {
  findDirectConversation(
    userAId: string,
    userBId: string,
  ): Promise<IConversation | null>;
  createConversation(data: Record<string, unknown>): Promise<IConversation>;
  findConversationById(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null>;
  findConversationsByUser(userId: string): Promise<IConversation[]>;
  updateLastMessage(
    conversationId: string,
    messageId: string,
  ): Promise<IConversation | null>;
  addParticipant(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null>;
  removeParticipant(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null>;
  createMessage(data: Record<string, unknown>): Promise<IMessage>;
  findMessages(
    conversationId: string,
    options?: FindMessagesOptions,
  ): Promise<IMessage[]>;
  findMessageById(messageId: string): Promise<IMessage | null>;
  markDelivered(messageId: string, userId: string): Promise<IMessage | null>;
  markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<unknown>;
  countUnread(conversationId: string, userId: string): Promise<number>;
}

export interface FindMessagesOptions {
  before?: string;
  limit?: number;
}
