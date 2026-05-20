import { injectable } from "tsyringe";
import Conversation from "./conversation";
import Message from "./message";
import { CONVERSATION_TYPE } from "../../shared/constants/index";
import { IChatRepository, FindMessagesOptions } from "../../shared/interfaces/IChatRepository";

/**
 * ChatRepository — Single Responsibility: all MongoDB data access for the Chat module.
 * Implements IChatRepository (DIP-ready) so services depend on the interface, not this class.
 * Open/Closed: new query methods are added here without modifying consumers.
 */
@injectable()
export default class ChatRepository implements IChatRepository {
  findDirectConversation(userAId: string, userBId: string): Promise<any> {
    return Conversation.findOne({
      type: CONVERSATION_TYPE.USER,
      participants: { $all: [userAId, userBId], $size: 2 },
    })
      .populate("participants", "username avatar status lastSeen")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "username avatar" } });
  }

  createConversation(data: any): Promise<any> {
    return Conversation.create(data);
  }

  findConversationById(conversationId: string, userId: string): Promise<any> {
    return Conversation.findOne({ _id: conversationId, participants: userId })
      .populate("participants", "username avatar status lastSeen")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "username avatar" } });
  }

  findConversationsByUser(userId: string): Promise<any> {
    return Conversation.find({ participants: userId })
      .populate("participants", "username avatar status lastSeen")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "username avatar" } })
      .sort({ updatedAt: -1 });
  }

  updateLastMessage(conversationId: string, messageId: string): Promise<any> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: messageId, updatedAt: new Date() },
      { new: true }
    );
  }

  addParticipant(conversationId: string, userId: string): Promise<any> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userId } },
      { new: true }
    );
  }

  removeParticipant(conversationId: string, userId: string): Promise<any> {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId } },
      { new: true }
    );
  }

  async createMessage(data: any): Promise<any> {
    const message = await Message.create(data);
    return message.populate([
      { path: "sender", select: "username avatar" },
      { path: "replyTo", populate: { path: "sender", select: "username" } },
    ]);
  }

  findMessages(conversationId: string, { before, limit = 20 }: FindMessagesOptions = {}): Promise<any> {
    const query: any = { conversation: conversationId, isDeleted: false };
    if (before) query.createdAt = { $lt: new Date(before) };

    return Message.find(query)
      .populate("sender", "username avatar")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username" } })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));
  }

  findMessageById(messageId: string): Promise<any> {
    return Message.findById(messageId).populate("sender", "username avatar");
  }

  markDelivered(messageId: string, userId: string): Promise<any> {
    return Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deliveredTo: { user: userId } } },
      { new: true }
    );
  }

  markConversationRead(conversationId: string, userId: string): Promise<any> {
    return Message.updateMany(
      {
        conversation: conversationId,
        "readBy.user": { $ne: userId },
        sender: { $ne: userId },
      },
      { $addToSet: { readBy: { user: userId } } }
    );
  }

  countUnread(conversationId: string, userId: string): Promise<any> {
    return Message.countDocuments({
      conversation: conversationId,
      "readBy.user": { $ne: userId },
      sender: { $ne: userId },
      isDeleted: false,
    });
  }
}
