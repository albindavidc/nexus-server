const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/auth.middleware');
const ctrl = require('./chat.controller');
const {
  sendMessageValidator,
  createGroupValidator,
  conversationIdValidator,
  userIdValidator,
  messageIdValidator,
  paginationValidator,
} = require('./chat.validator');

router.use(protect);

router.get('/conversations', ctrl.getMyConversations);
router.get('/conversations/:conversationId', conversationIdValidator, ctrl.getConversationById);
router.post('/conversations/direct/:userId', userIdValidator, ctrl.startDirectConversation);
router.post('/conversations/group', createGroupValidator, ctrl.createGroupConversation);

router.get(
  '/conversations/:conversationId/messages',
  [...conversationIdValidator.slice(0, -1), ...paginationValidator],
  ctrl.getMessages
);

router.post(
  '/conversations/:conversationId/messages',
  [...conversationIdValidator.slice(0, -1), ...sendMessageValidator],
  ctrl.sendMessage
);

router.patch(
  '/conversations/:conversationId/read',
  conversationIdValidator,
  ctrl.markConversationRead
);

router.delete('/messages/:messageId', messageIdValidator, ctrl.deleteMessage);

module.exports = router;
