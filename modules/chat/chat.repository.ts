import { injectable } from "tsyringe";
import Conversation, { IConversation } from "./conversation.model";
import Message, { IMessage } from "./message.model";
import { CONVERSATION_TYPE } from "../../shared/constants/index";
import {
  IChatRepository,
  FindMessagesOptions,
} from "../../shared/interfaces/repository/chat-repository.interface";

@injectable()
export default class ChatRepository implements IChatRepository {
  findDirectConversation(
    userAId: string,
    userBId: string,
  ): Promise<IConversation | null> {
    return Conversation.findOne({
      type: CONVERSATION_TYPE.DIRECT,
      participants: { $all: [userAId, userBId], $size: 2 },
      isDeleted: false,
    })
      .populate("participants", "username avatar status lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });
  }

  createConversation(data: Record<string, unknown>): Promise<IConversation> {
    return Conversation.create(data);
  }

  findConversationById(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null> {
    return Conversation.findOne({
      _id: conversationId,
      $or: [
        { type: CONVERSATION_TYPE.GROUP, "members.user": userId },
        {
          type: { $in: [CONVERSATION_TYPE.DIRECT, CONVERSATION_TYPE.AI] },
          participants: userId,
        },
      ],
      isDeleted: false,
    })
      .populate("participants", "username avatar status lastSeen")
      .populate("members.user", "username avatar status lastSeen")
      .populate("creator", "username avatar status lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });
  }

  findConversationsByUser(userId: string): Promise<IConversation[]> {
    return Conversation.find({
      type: { $in: [CONVERSATION_TYPE.DIRECT, CONVERSATION_TYPE.AI] },
      participants: userId,
      isDeleted: false,
    })
      .populate("participants", "username avatar status lastSeen")
      .populate("creator", "username avatar status lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      })
      .sort({ updatedAt: -1 });
  }

  updateLastMessage(
    conversationId: string,
    messageId: string,
  ): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: messageId, updatedAt: new Date() },
      { new: true },
    );
  }

  addParticipant(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userId } },
      { new: true },
    );
  }

  removeParticipant(
    conversationId: string,
    userId: string,
  ): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId } },
      { new: true },
    );
  }

  async createMessage(data: Record<string, unknown>): Promise<IMessage> {
    const message = await Message.create(data);
    return message.populate([
      { path: "sender", select: "username avatar" },
      { path: "replyTo", populate: { path: "sender", select: "username" } },
    ]);
  }

  findMessages(
    conversationId: string,
    { before, limit = 20 }: FindMessagesOptions = {},
  ): Promise<IMessage[]> {
    const query: Record<string, unknown> = {
      conversation: conversationId,
      isDeleted: false,
    };
    if (before) query.createdAt = { $lt: new Date(before) };

    return Message.find(query)
      .populate("sender", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" },
      })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));
  }

  findMessageById(messageId: string): Promise<IMessage | null> {
    return Message.findById(messageId).populate("sender", "username avatar");
  }

  markDelivered(messageId: string, userId: string): Promise<IMessage | null> {
    return Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deliveredTo: { user: userId } } },
      { new: true },
    );
  }

  markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<unknown> {
    return Message.updateMany(
      {
        conversation: conversationId,
        "readBy.user": { $ne: userId },
        sender: { $ne: userId },
      },
      { $addToSet: { readBy: { user: userId } } },
    );
  }

  countUnread(conversationId: string, userId: string): Promise<number> {
    return Message.countDocuments({
      conversation: conversationId,
      "readBy.user": { $ne: userId },
      sender: { $ne: userId },
      isDeleted: false,
    });
  }

  async clearMessages(conversationId: string): Promise<void> {
    await Message.updateMany(
      { conversation: conversationId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }

  async searchMessagesInConversation(
    conversationId: string,
    query: string,
  ): Promise<IMessage[]> {
    return Message.find({
      conversationId: conversationId,
      $text: { $search: query },
    })
      .sort({ sort: { $meta: "textScore" } })
      .populate("sender", "username")
      .limit(10);
  }
}
