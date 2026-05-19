const chatService = require('./chat.service');
const { sendSuccess } = require('../../shared/utils/response');

const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await chatService.getMyConversations(req.user._id);
    sendSuccess(res, 200, 'Conversations fetched.', { conversations });
  } catch (err) {
    next(err);
  }
};

const getConversationById = async (req, res, next) => {
  try {
    const conversation = await chatService.getConversationById(
      req.params.conversationId,
      req.user._id
    );
    sendSuccess(res, 200, 'Conversation fetched.', { conversation });
  } catch (err) {
    next(err);
  }
};

const startDirectConversation = async (req, res, next) => {
  try {
    const conversation = await chatService.getOrCreateDirectConversation(
      req.user._id,
      req.params.userId
    );
    sendSuccess(res, 200, 'Direct conversation ready.', { conversation });
  } catch (err) {
    next(err);
  }
};

const createGroupConversation = async (req, res, next) => {
  try {
    const conversation = await chatService.createGroupConversation(req.user._id, req.body);
    sendSuccess(res, 201, 'Group conversation created.', { conversation });
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { before, limit } = req.query;
    const messages = await chatService.getMessages(
      req.params.conversationId,
      req.user._id,
      { before, limit: limit ? parseInt(limit, 10) : undefined }
    );
    sendSuccess(res, 200, 'Messages fetched.', { messages });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const message = await chatService.sendMessage(
      req.user._id,
      req.params.conversationId,
      req.body
    );
    sendSuccess(res, 201, 'Message sent.', { message });
  } catch (err) {
    next(err);
  }
};

const markConversationRead = async (req, res, next) => {
  try {
    await chatService.markAsRead(req.params.conversationId, req.user._id);
    sendSuccess(res, 200, 'Conversation marked as read.');
  } catch (err) {
    next(err);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    await chatService.deleteMessage(req.params.messageId, req.user._id);
    sendSuccess(res, 200, 'Message deleted.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyConversations,
  getConversationById,
  startDirectConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
};
