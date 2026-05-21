import { FindMessagesOptions } from "./IChatRepository";

import { IConversation } from "../../modules/chat/conversation";
import { IMessage } from "../../modules/chat/message";

export interface IChatService {
  getOrCreateDirectConversation(requesterId: string, targetUserId: string): Promise<IConversation>;
  createGroupConversation(creatorId: string, data: CreateGroupDto): Promise<IConversation>;
  getMyConversations(userId: string): Promise<IConversation[]>;
  getConversationById(conversationId: string, userId: string): Promise<IConversation | null>;
  sendMessage(senderId: string, conversationId: string, data: SendMessageDto): Promise<IMessage>;
  getMessages(conversationId: string, userId: string, options: FindMessagesOptions): Promise<IMessage[]>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  deleteMessage(messageId: string, userId: string): Promise<IMessage>;
}

export interface CreateGroupDto {
  name: string;
  participantIds: string[];
}

export interface SendMessageDto {
  content?: string;
  type?: string;
  replyTo?: string;
  mediaUrl?: string;
}
