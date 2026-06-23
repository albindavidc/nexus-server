"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotRepository = void 0;
const tsyringe_1 = require("tsyringe");
const chatbot_model_1 = __importDefault(require("./chatbot.model"));
let ChatBotRepository = class ChatBotRepository {
    async getHistory(userId) {
        const docs = await chatbot_model_1.default.findOne({ user: userId }).lean();
        return docs?.messages ?? [];
    }
    async getRecentMessage(userId, limit = 10) {
        const docs = await chatbot_model_1.default.findOne({ user: userId }, { messages: { $slice: -limit } }).lean();
        return docs?.messages ?? [];
    }
    async appendMessagePair(userId, userMessage, botMessage) {
        await chatbot_model_1.default.findOneAndUpdate({ user: userId }, {
            $push: {
                messages: { $each: [userMessage, botMessage] },
            },
            $setOnInsert: { user: userId },
        }, {
            upsert: true,
            new: true,
        });
    }
    async clearHistory(userId) {
        await chatbot_model_1.default.findOneAndUpdate({ user: userId }, {
            $set: { messages: [] },
        });
    }
    async deleteHistory(userId) {
        await chatbot_model_1.default.deleteOne({ user: userId });
    }
};
exports.ChatBotRepository = ChatBotRepository;
exports.ChatBotRepository = ChatBotRepository = __decorate([
    (0, tsyringe_1.injectable)()
], ChatBotRepository);
