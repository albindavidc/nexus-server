"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDependencies = registerDependencies;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("./tokens");
const jwt_util_1 = require("../utils/jwt.util");
const auth_service_1 = __importDefault(require("../../modules/auth/auth.service"));
const auth_repository_1 = __importDefault(require("../../modules/auth/auth.repository"));
const chat_repository_1 = __importDefault(require("../../modules/chat/chat.repository"));
const chat_service_1 = __importDefault(require("../../modules/chat/chat.service"));
const group_repository_1 = require("../../modules/group/group.repository");
const group_service_1 = require("../../modules/group/group.service");
const chatbot_service_1 = require("../../modules/chatbot/chatbot.service");
const chatbot_repository_1 = require("../../modules/chatbot/chatbot.repository");
const events_1 = require("events");
const notification_repository_1 = require("../../modules/push-notification/notification-repository");
const notification_services_1 = require("../../modules/push-notification/notification.services");
const notification_repository_2 = require("../../modules/notification/notification.repository");
const notification_service_1 = require("../../modules/notification/notification.service");
function registerDependencies() {
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.JwtService, jwt_util_1.JwtService);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.AuthRepository, auth_repository_1.default);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.AuthService, auth_service_1.default);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.ChatRepository, chat_repository_1.default);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.ChatService, chat_service_1.default);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.GroupRepository, group_repository_1.GroupRepository);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.GroupService, group_service_1.GroupService);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.ChatBotService, chatbot_service_1.ChatBotService);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.ChatBotRepository, chatbot_repository_1.ChatBotRepository);
    tsyringe_1.container.registerInstance(tokens_1.TOKENS.EventEmitter, new events_1.EventEmitter());
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.PushNotificationRepository, notification_repository_1.PushNotificationRepository);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.PushNotificationService, notification_services_1.PushNotificationService);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.NotificationRepository, notification_repository_2.NotificationRepository);
    tsyringe_1.container.registerSingleton(tokens_1.TOKENS.NotificationService, notification_service_1.NotificationService);
}
