"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvent = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
const index_1 = require("../../shared/constants/index");
const notification_services_1 = require("../push-notification/notification.services");
const events_1 = __importDefault(require("events"));
let ChatEvent = class ChatEvent {
    _pushNotificationService;
    _eventEmitter;
    constructor(_pushNotificationService, _eventEmitter) {
        this._pushNotificationService = _pushNotificationService;
        this._eventEmitter = _eventEmitter;
    }
    handleMessageSent() {
        this._eventEmitter.on("message.sent", async ({ message, recipientIds, }) => {
            const payload = {
                title: "New Message",
                body: message.type === index_1.MESSAGE_TYPE.TEXT
                    ? message.content
                    : `Sent a ${message.type.toLowerCase()}`,
                url: message.conversation
                    ? `/chat/${message.conversation}`
                    : `/chat/group/${message.groupRef}`,
            };
            await Promise.allSettled(recipientIds.map((id) => this._pushNotificationService.sendPushNotification(id, payload)));
        });
    }
};
exports.ChatEvent = ChatEvent;
exports.ChatEvent = ChatEvent = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.PushNotificationService)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.EventEmitter)),
    __metadata("design:paramtypes", [notification_services_1.PushNotificationService,
        events_1.default])
], ChatEvent);
