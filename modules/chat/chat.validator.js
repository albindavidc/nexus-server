const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const AppError = require('../../shared/errors/AppError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    return next(new AppError(messages, 422));
  }
  next();
};

const sendMessageValidator = [
  body('content')
    .if(body('type').not().equals('image').not().equals('file'))
    .notEmpty().withMessage('Message content is required.')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters.')
    .trim(),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file']).withMessage('Invalid message type.'),
  body('replyTo')
    .optional()
    .isMongoId().withMessage('replyTo must be a valid message ID.'),
  validate,
];

const createGroupValidator = [
  body('name')
    .notEmpty().withMessage('Group name is required.')
    .isLength({ max: 80 }).withMessage('Group name cannot exceed 80 characters.')
    .trim(),
  body('participantIds')
    .isArray({ min: 1 }).withMessage('Provide at least one participant.'),
  body('participantIds.*')
    .isMongoId().withMessage('Each participant must be a valid user ID.'),
  validate,
];

const conversationIdValidator = [
  param('conversationId').isMongoId().withMessage('Invalid conversation ID.'),
  validate,
];

const userIdValidator = [
  param('userId').isMongoId().withMessage('Invalid user ID.'),
  validate,
];

const messageIdValidator = [
  param('messageId').isMongoId().withMessage('Invalid message ID.'),
  validate,
];

const paginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
  query('before')
    .optional()
    .isISO8601().withMessage('before must be a valid ISO 8601 date.'),
  validate,
];

module.exports = {
  sendMessageValidator,
  createGroupValidator,
  conversationIdValidator,
  userIdValidator,
  messageIdValidator,
  paginationValidator,
};
