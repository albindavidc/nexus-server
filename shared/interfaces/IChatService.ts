import { FindMessagesOptions } from "./IChatRepository";

/**
 * Contract for Chat business logic operations.
 * Follows Interface Segregation Principle — chat use-cases only.
 */
export interface IChatService {
  getOrCreateDirectConversation(requesterId: string, targetUserId: string): Promise<any>;
  createGroupConversation(creatorId: string, data: CreateGroupDto): Promise<any>;
  getMyConversations(userId: string): Promise<any>;
  getConversationById(conversationId: string, userId: string): Promise<any>;
  sendMessage(senderId: string, conversationId: string, data: SendMessageDto): Promise<any>;
  getMessages(conversationId: string, userId: string, options: FindMessagesOptions): Promise<any>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  deleteMessage(messageId: string, userId: string): Promise<any>;
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
