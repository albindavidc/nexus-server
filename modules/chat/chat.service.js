const chatRepo = require('./chat.repository');
const User = require('../auth/auth.model');
const AppError = require('../../shared/errors/AppError');
const { CONVERSATION_TYPES, MESSAGE_TYPES } = require('../../shared/constants');

const getOrCreateDirectConversation = async (requesterId, targetUserId) => {
  if (requesterId.toString() === targetUserId.toString()) {
    throw new AppError("You can't start a conversation with yourself.", 400);
  }

  const targetUser = await User.findById(targetUserId).select('_id username');
  if (!targetUser) throw new AppError('User not found.', 404);

  let conversation = await chatRepo.findDirectConversation(requesterId, targetUserId);
  if (!conversation) {
    conversation = await chatRepo.createConversation({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [requesterId, targetUserId],
    });
    conversation = await chatRepo.findConversationById(conversation._id, requesterId);
  }

  return conversation;
};

const createGroupConversation = async (creatorId, { name, participantIds }) => {
  if (!name || name.trim().length === 0) {
    throw new AppError('Group name is required.', 400);
  }

  const uniqueIds = [...new Set([creatorId.toString(), ...participantIds.map(String)])];

  if (uniqueIds.length < 2) {
    throw new AppError('A group must have at least 2 participants.', 400);
  }

  const users = await User.find({ _id: { $in: uniqueIds } }).select('_id');
  if (users.length !== uniqueIds.length) {
    throw new AppError('One or more participants not found.', 404);
  }

  const conversation = await chatRepo.createConversation({
    type: CONVERSATION_TYPES.GROUP,
    name: name.trim(),
    participants: uniqueIds,
    admin: creatorId,
  });

  return chatRepo.findConversationById(conversation._id, creatorId);
};

const getMyConversations = (userId) => chatRepo.findConversationsByUser(userId);

const getConversationById = async (conversationId, userId) => {
  const conversation = await chatRepo.findConversationById(conversationId, userId);
  if (!conversation) throw new AppError('Conversation not found.', 404);
  return conversation;
};

const sendMessage = async (senderId, conversationId, { content, type = MESSAGE_TYPES.TEXT, replyTo, mediaUrl }) => {
  const conversation = await chatRepo.findConversationById(conversationId, senderId);
  if (!conversation) throw new AppError('Conversation not found or access denied.', 404);

  if (type === MESSAGE_TYPES.TEXT && (!content || content.trim().length === 0)) {
    throw new AppError('Message content cannot be empty.', 400);
  }

  const message = await chatRepo.createMessage({
    conversation: conversationId,
    sender: senderId,
    type,
    content: content?.trim(),
    mediaUrl: mediaUrl || null,
    replyTo: replyTo || null,
  });

  await chatRepo.updateLastMessage(conversationId, message._id);

  return message;
};

const getMessages = async (conversationId, userId, { before, limit }) => {
  const conversation = await chatRepo.findConversationById(conversationId, userId);
  if (!conversation) throw new AppError('Conversation not found or access denied.', 404);

  const messages = await chatRepo.findMessages(conversationId, { before, limit });

  return messages.reverse();
};

const markAsRead = async (conversationId, userId) => {
  const conversation = await chatRepo.findConversationById(conversationId, userId);
  if (!conversation) throw new AppError('Conversation not found.', 404);

  await chatRepo.markConversationRead(conversationId, userId);
};

const deleteMessage = async (messageId, userId) => {
  const message = await chatRepo.findMessageById(messageId);
  if (!message) throw new AppError('Message not found.', 404);

  if (message.sender._id.toString() !== userId.toString()) {
    throw new AppError('You can only delete your own messages.', 403);
  }

  await message.softDelete();
  return message;
};

module.exports = {
  getOrCreateDirectConversation,
  createGroupConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
};
