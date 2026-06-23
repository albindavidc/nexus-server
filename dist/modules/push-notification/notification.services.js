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
exports.PushNotificationService = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
const push_util_1 = require("../../shared/utils/push.util");
const logger_1 = __importDefault(require("../../shared/utils/logger"));
let PushNotificationService = class PushNotificationService {
    _pushRepo;
    constructor(_pushRepo) {
        this._pushRepo = _pushRepo;
    }
    async sendPushNotification(userId, payload) {
        const subscription = await this._pushRepo.getUserById(userId);
        const results = await Promise.allSettled(subscription.map((sub) => (0, push_util_1.sendPushNotification)(sub, payload)));
        results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value === false) {
                this._pushRepo
                    .deleteByEndpoint(subscription[index].endpoint)
                    .catch(logger_1.default.error);
            }
            if (result.status === "rejected") {
                logger_1.default.error(`[notification.services.ts] Error sending push notification to user ${userId}`, result.reason);
            }
        });
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.PushNotificationRepository)),
    __metadata("design:paramtypes", [Object])
], PushNotificationService);
