import { injectable, inject } from "tsyringe";
import { Types } from "mongoose";
import User from "../auth/auth.model";
import { IConversation, IConversationDocument } from "./conversation.model";
import { IMessage } from "./message.model";
import AppError from "../../shared/errors/AppError";
import {
  IChatService,
  CreateGroupDto,
  SendMessageDto,
} from "../../shared/interfaces/services/chat-service.interface";
import {
  IChatRepository,
  FindMessagesOptions,
} from "../../shared/interfaces/repository/chat-repository.interface";
import { TOKENS } from "../../shared/di/tokens";
import {
  CONVERSATION_TYPE,
  MESSAGE_TYPE,
  GROUP_ROLES,
} from "../../shared/constants/index";
import EventEmitter from "events";

@injectable()
export default class ChatService implements IChatService {
  constructor(
    @inject(TOKENS.ChatRepository) private _chatRepo: IChatRepository,
    @inject(TOKENS.EventEmitter) private eventEmitter: EventEmitter,
  ) {}

  async getOrCreateDirectConversation(
    requesterId: string,
    targetUserId: string,
  ): Promise<IConversation> {
    if (requesterId === targetUserId) {
      throw new AppError("You can't start a conversation with yourself.", 400);
    }

    const targetUser = await User.findById(targetUserId).select("_id username");
    if (!targetUser) throw new AppError("User not found.", 404);

    let conversation = await this._chatRepo.findDirectConversation(
      requesterId,
      targetUserId,
    );
    if (!conversation) {
      conversation = await this._chatRepo.createConversation({
        type: CONVERSATION_TYPE.DIRECT,
        participants: [requesterId, targetUserId],
      });
      conversation = await this._chatRepo.findConversationById(
        String((conversation as IConversationDocument)._id),
        requesterId,
      );
    }

    return conversation as IConversation;
  }

  async createGroupConversation(
    creatorId: string,
    { name, participantIds }: CreateGroupDto,
  ): Promise<IConversation> {
    if (!name?.trim()) {
      throw new AppError("Group name is required.", 400);
    }

    const uniqueIds = [...new Set([creatorId, ...participantIds.map(String)])];
    if (uniqueIds.length < 2) {
      throw new AppError("A group must have at least 2 participants.", 400);
    }

    const users = await User.find({ _id: { $in: uniqueIds } }).select("_id");
    if (users.length !== uniqueIds.length) {
      throw new AppError("One or more participants not found.", 404);
    }

    const members = uniqueIds.map((id) => ({
      user: new Types.ObjectId(id),
      role: id === creatorId ? GROUP_ROLES.ADMIN : GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
    }));

    const conversation = await this._chatRepo.createConversation({
      type: CONVERSATION_TYPE.GROUP,
      name: name.trim(),
      participants: uniqueIds.map((id) => new Types.ObjectId(id)),
      members,
      creator: new Types.ObjectId(creatorId),
    });

    return this._chatRepo.findConversationById(
      String((conversation as IConversationDocument)._id),
      creatorId,
    ) as Promise<IConversation>;
  }

  async getMyConversations(userId: string): Promise<IConversation[]> {
    return this._chatRepo.findConversationsByUser(userId);
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<IConversation> {
    const conversation = await this._chatRepo.findConversationById(
      conversationId,
      userId,
    );
    if (!conversation) throw new AppError("Conversation not found.", 404);
    return conversation;
  }

  async sendMessage(
    senderId: string,
    conversationId: string,
    { content, type = MESSAGE_TYPE.TEXT, replyTo, mediaUrl }: SendMessageDto,
  ): Promise<IMessage> {
    const conversation = await this._chatRepo.findConversationById(
      conversationId,
      senderId,
    );
    if (!conversation)
      throw new AppError("Conversation not found or access denied.", 404);

    if (type === MESSAGE_TYPE.TEXT && !content?.trim()) {
      throw new AppError("Message content cannot be empty.", 400);
    }

    const message = await this._chatRepo.createMessage({
      conversation: conversationId,
      sender: senderId,
      type,
      content: content?.trim(),
      mediaUrl: mediaUrl ?? null,
      replyTo: replyTo ?? null,
    });

    const recipientIds = conversation.participants
      .map((p: Types.ObjectId | { _id: Types.ObjectId }) => 
        p instanceof Types.ObjectId ? p.toString() : p._id.toString()
      )
      .filter((id: string) => id !== senderId);
    this.eventEmitter.emit("message.sent", { message, recipientIds });

    await this._chatRepo.updateLastMessage(conversationId, String(message._id));
    return message;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options: FindMessagesOptions,
  ): Promise<IMessage[]> {
    const conversation = await this._chatRepo.findConversationById(
      conversationId,
      userId,
    );
    if (!conversation)
      throw new AppError("Conversation not found or access denied.", 404);

    const messages = await this._chatRepo.findMessages(conversationId, options);
    return messages.reverse();
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this._chatRepo.findConversationById(
      conversationId,
      userId,
    );
    if (!conversation) throw new AppError("Conversation not found.", 404);

    await this._chatRepo.markConversationRead(conversationId, userId);
  }

  async deleteMessage(messageId: string, userId: string): Promise<IMessage> {
    const message = await this._chatRepo.findMessageById(messageId);
    if (!message) throw new AppError("Message not found.", 404);

    if (message.sender._id.toString() !== userId) {
      throw new AppError("You can only delete your own messages.", 403);
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return message;
  }

  async clearConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this._chatRepo.findConversationById(
      conversationId,
      userId,
    );
    if (!conversation)
      throw new AppError("Conversation not found or access denied.", 404);

    await this._chatRepo.clearMessages(conversationId);
  }
}
