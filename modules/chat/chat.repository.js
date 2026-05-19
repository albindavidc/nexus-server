const Conversation = require('./conversation');
const Message = require('./message');
const { DEFAULT_PAGE_SIZE } = require('../../shared/constants');

const findDirectConversation = (userAId, userBId) =>
  Conversation.findOne({
    type: 'direct',
    participants: { $all: [userAId, userBId], $size: 2 },
  })
    .populate('participants', 'username avatar status lastSeen')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } });

const createConversation = (data) => Conversation.create(data);

const findConversationById = (conversationId, userId) =>
  Conversation.findOne({ _id: conversationId, participants: userId })
    .populate('participants', 'username avatar status lastSeen')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } });

const findConversationsByUser = (userId) =>
  Conversation.find({ participants: userId })
    .populate('participants', 'username avatar status lastSeen')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username avatar' } })
    .sort({ updatedAt: -1 });

const updateLastMessage = (conversationId, messageId) =>
  Conversation.findByIdAndUpdate(
    conversationId,
    { lastMessage: messageId, updatedAt: new Date() },
    { new: true }
  );

const addParticipant = (conversationId, userId) =>
  Conversation.findByIdAndUpdate(
    conversationId,
    { $addToSet: { participants: userId } },
    { new: true }
  );

const removeParticipant = (conversationId, userId) =>
  Conversation.findByIdAndUpdate(
    conversationId,
    { $pull: { participants: userId } },
    { new: true }
  );

const createMessage = async (data) => {
  const message = await Message.create(data);
  return message.populate([
    { path: 'sender', select: 'username avatar' },
    { path: 'replyTo', populate: { path: 'sender', select: 'username' } },
  ]);
};

const findMessages = (conversationId, { before, limit = 20 } = {}) => {
  const query = { conversation: conversationId, isDeleted: false };
  if (before) query.createdAt = { $lt: new Date(before) };

  return Message.find(query)
    .populate('sender', 'username avatar')
    .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username' } })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100));
};

const findMessageById = (messageId) =>
  Message.findById(messageId).populate('sender', 'username avatar');

const markDelivered = (messageId, userId) =>
  Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { deliveredTo: { user: userId } } },
    { new: true }
  );

const markConversationRead = (conversationId, userId) =>
  Message.updateMany(
    {
      conversation: conversationId,
      'readBy.user': { $ne: userId },
      sender: { $ne: userId },
    },
    { $addToSet: { readBy: { user: userId } } }
  );

const countUnread = (conversationId, userId) =>
  Message.countDocuments({
    conversation: conversationId,
    'readBy.user': { $ne: userId },
    sender: { $ne: userId },
    isDeleted: false,
  });

module.exports = {
  findDirectConversation,
  createConversation,
  findConversationById,
  findConversationsByUser,
  updateLastMessage,
  addParticipant,
  removeParticipant,
  createMessage,
  findMessages,
  findMessageById,
  markDelivered,
  markConversationRead,
  countUnread,
};
