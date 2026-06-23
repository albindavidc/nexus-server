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
exports.ChatController = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
const chat_service_1 = __importDefault(require("./chat.service"));
const mongoose_1 = require("mongoose");
let ChatController = class ChatController {
    chatService;
    groupService;
    constructor(chatService, groupService) {
        this.chatService = chatService;
        this.groupService = groupService;
    }
    async uploadAttachment(req, res, next) {
        try {
            if (!req.file)
                throw new AppError_1.default("File is required", 400);
            const file = req.file;
            return res.status(200).json({
                status: true,
                message: "Attachment uploaded successfully",
                data: {
                    mediaUrl: file.location,
                    mediaMeta: {
                        mimeType: req.file.mimetype,
                        size: req.file.size,
                        filename: req.file.originalname,
                    },
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    searchMessagesInConversation = async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const { query } = req.query;
            const userId = req.userId;
            if (!conversationId || !query)
                throw new AppError_1.default("Conversation ID and query are required", 400);
            const results = await this.chatService.searchMessagesInConversation(conversationId, userId, query);
            return res.status(200).json({
                status: true,
                message: "Messages searched successfully",
                data: results,
            });
        }
        catch (error) {
            next(error);
        }
    };
    createGroup = async (req, res, next) => {
        try {
            const userId = req.userId;
            const data = req.body;
            // Handle undefined participantIds
            if (!data.participantIds) {
                data.participantIds = [];
            }
            const conversation = await this.groupService.createGroup(new mongoose_1.Types.ObjectId(userId), data);
            return res.status(201).json({
                status: true,
                message: "Group created successfully",
                data: { conversation },
            });
        }
        catch (error) {
            next(error);
        }
    };
};
exports.ChatController = ChatController;
exports.ChatController = ChatController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.ChatService)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.GroupService)),
    __metadata("design:paramtypes", [chat_service_1.default, Object])
], ChatController);
