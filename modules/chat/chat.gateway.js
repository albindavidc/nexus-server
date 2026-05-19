const { Server } = require("socket.io");
const { authenticateSocket } = require("../../middlewares/auth.middleware");
const { SOCKET_EVENTS } = require("../../../shared/constants");
const logger = require("../../shared/utils/logger");
const User = require("../auth/auth.model");

const initSocket = (httpServer, clientUrl) => {
  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 15000,
  });

  io.use(authenticateSocket);

  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    const userId = socket.userId.toString();
    logger.debug(`User ${userId} Connected`);

    onUserConnect(socket, io, userId);
    socket.join(userId);

    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (data) => {
      handleJoinUserConversation(socket, io, data);
    });
    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (data) => {
      handleLeaveUserConversation(socket, io, data);
    });
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => {
      handleSendMessage(socket, io, data);
    });
    socket.on(SOCKET_EVENTS.READ_MESSAGE, (data) => {
      handleReadMessage(socket, io, data);
    });
    socket.on(SOCKET_EVENTS.TYPING_START, (data) => {
      handleTyping(socket, io, data, true);
    });
    socket.on(SOCKET_EVENTS.TYPING_END, (data) => {
      handleTyping(socket, io, data, false);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () =>
      onUserDisconnect(socket, io, userId),
    );
  });
};

const onUserConnect = async (socket, io, userId) => {
  try {
    const user = await User.findByIdAndUpdate(userId, {
      status: USER_STATUS.ONLINE,
      $addToSet: { socketIds: socket.id },
    });
    if (!user) {
      logger.warn(`User ${userId} not found`);
      return;
    }

    broadcastPresence(io, userId, USER_STATUS.ONLINE);
  } catch (error) {
    logger.error(`Failed to handle user connect for user ${userId}:`, error);
  }
};

const onUserDisconnect = async (socket, io, userId) => {
  try {
    logger.debug(`User ${userId} Disconnected `);
    await User.findByIdAndUpdate(userId, {
      $pull: { socketIds: socket.id },
    });

    const isOffline = await User.findById(userId).select("socketIds");
    if (isOffline?.socketIds?.length === 0) {
      await User.findByIdAndUpdate(userId, {
        status: USER_STATUS.OFFLINE,
        $set: { lastSeen: new Date() },
      });
      broadcastPresence(io, userId, USER_STATUS.OFFLINE);
    }
  } catch (error) {
    logger.error(`Failed to handle user disconnect for user ${userId}:`, error);
  }
};

const broadcastPresence = async (io, userId, status) => {
  try {
    const conversations = await chatRepo.getConversationsByUser(userId);
    conversations.forEach((conversation) => {
      const otherUserId = conversation.participants.find(
        (id) => id.toString() !== userId,
      );

      io.to(otherUserId).emit(
        status === SOCKET_EVENTS.ONLINE
          ? SOCKET_EVENTS.ONLINE
          : SOCKET_EVENTS.OFFLINE,
        { userId },
      );
    });

    logger.debug(`User ${userId} broadcasted presence with status ${status}`);
  } catch (error) {
    logger.error(`Failed to broadcast presence for user ${userId}:`, error);
  }
};

const handleJoinUserConversation = async (socket, { conversationId }) => {
  try {
    if (!conversationId) {
      emitError(socket, "Conversation ID is required");
      return;
    }

    const conversation = await chatRepo.getConversationById(conversationId);
    if (!conversation) {
      emitError(socket, "Conversation Not Found");
      return;
    }

    socket.join(conversationId);
    logger.debug(`User ${socket.userId} joined conversation ${conversationId}`);
  } catch (error) {
    logger.error(
      `Failed to join conversation for user ${socket.userId}:`,
      error,
    );
  }
};

const handleLeaveUserConversation = async (socket, io, conversationId) => {
  try {
    if (!conversationId) {
      emitError(socket, "Conversation ID is required");
      return;
    }

    const conversation = await chatRepo.getConversationById(conversationId);
    if (!conversation) {
      emitError(socket, "Conversation Not Found");
      return;
    }

    socket.leave(conversationId);
    logger.debug(`User ${socket.userId} left conversation ${conversationId}`);
  } catch (error) {
    logger.error(
      `Failed to leave conversation for user ${socket.userId}:`,
      error,
    );
  }
};

const handleSendMessage = async (
  socket,
  io,
  { conversationId, content, type, mediaURL, replayTo },
) => {
  try {
    if (!conversationId) {
      emitError(socket, "Conversation ID is required");
      return;
    }
    if (!content) {
      emitError(socket, "Message content is required");
      return;
    }

    const message = chatRepo.createMessage(
      socket.userId,
      conversationId,
      content,
      type,
      mediaURL,
      replayTo,
    );

    io.to(conversationId).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

    socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
      messageId: message._id,
      conversationId: conversationId,
    });
  } catch (error) {
    logger.error(`Failed to send message for user ${socket.userId}:`, error);
    emitError(socket, "Failed to send message");
  }
};

const handleReadMessage = async (socket, io, conversationId) => {
  try {
    if (!conversationId) {
      emitError(socket, "Conversation ID is required");
      return;
    }
    const conversation = await chatRepo.getConversationById(conversationId);
    if (!conversation) {
      emitError(socket, "Conversation Not Found");
      return;
    }

    const message = await chatRepo.markMessageAsRead(
      socket.userId,
      conversationId,
    );
    io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_READ, message);
    logger.debug(
      `User ${socket.userId} read message in conversation ${conversationId}`,
    );
  } catch (error) {
    logger.error(`Failed to read message for user ${socket.userId}:`, error);
    emitError(socket, "Failed to read message");
  }
};

const handleTyping = async (socket, io, { converstationId }, isTyping) => {
  try {
    if (!conversationid) return;

    socket.to(converstationId).emit(SOCKET_EVENTS.TYPING, {
      conversationId,

      userId: socket.userId,
      isTyping,
    });
  } catch (error) {
    logger.error(`Failed to send typing for user ${socket.userId}:`, error);
    emitError(socket, "Failed to send typing");
  }
};

const emitError = async (socket, message) => {
  try {
    socket.emit(SOCKET_EVENTS.ERROR, { message });
    logger.debug(`User ${socket.userId} emitted error: ${message}`);
  } catch (error) {
    logger.error(`Failed to emit error for user ${socket.userId}:`, error);
  }
};

module.exports = { initSocket };
