/**
 * Contract for Chat data persistence operations.
 * Follows Interface Segregation Principle — data access only, no business logic.
 */
export interface IChatRepository {
  findDirectConversation(userAId: string, userBId: string): Promise<any>;
  createConversation(data: any): Promise<any>;
  findConversationById(conversationId: string, userId: string): Promise<any>;
  findConversationsByUser(userId: string): Promise<any>;
  updateLastMessage(conversationId: string, messageId: string): Promise<any>;
  addParticipant(conversationId: string, userId: string): Promise<any>;
  removeParticipant(conversationId: string, userId: string): Promise<any>;
  createMessage(data: any): Promise<any>;
  findMessages(conversationId: string, options?: FindMessagesOptions): Promise<any>;
  findMessageById(messageId: string): Promise<any>;
  markDelivered(messageId: string, userId: string): Promise<any>;
  markConversationRead(conversationId: string, userId: string): Promise<any>;
  countUnread(conversationId: string, userId: string): Promise<any>;
}

export interface FindMessagesOptions {
  before?: string;
  limit?: number;
}
