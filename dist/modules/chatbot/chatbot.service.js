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
exports.ChatBotService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
const tsyringe_1 = require("tsyringe");
const logger_1 = __importDefault(require("../../shared/utils/logger"));
const tokens_1 = require("../../shared/di/tokens");
const MODEL = "gemini-2.5-flash";
const SYSTEM_PROMPT = `You are Nexus Coach, an expert AI fitness assistant
embedded in the Nexus calisthenics community app.
- Give precise, science-backed calisthenics and bodyweight training advice
- Help users plan workouts, track progress, and overcome plateaus
- Explain exercise form, progressions, and modifications
- Motivate and coach users in a friendly, energetic tone
- Keep responses concise and actionable — prefer bullet points and clear steps
- When asked about non-fitness topics, gently steer back to fitness
You never diagnose medical conditions. Always recommend a doctor for injuries.
Always respond in the same language the user writes in.

FORMATTING RULES (follow strictly in every response):
- Unordered lists: Use standard markdown bullets (- or *), all aligned at the same left margin.
- Ordered lists: Use 1. 2. 3. numbering, aligned at the same left margin as unordered lists.
- Nested lists: Indent nested items exactly 2 spaces deeper than their parent.
- No mixed indentation: Ordered and unordered lists at the same logical level must start at the same column.
- Consistent spacing: Leave one blank line before and after each list block, but no extra blank lines between list items.
- Never use deeply nested lists beyond 2 levels. Flatten where possible.
- Keep list items concise — one idea per item.`;
const BULK_CONCURRENCY = 5;
let ChatBotService = class ChatBotService {
    _chatBotRepository;
    _genAI;
    constructor(_chatBotRepository) {
        this._chatBotRepository = _chatBotRepository;
        if (!process.env.GEMINI_API_KEY) {
            throw new AppError_1.default("Gemini API Key is required", 404);
        }
        this._genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    async chat(userId, dto) {
        try {
            const dbHistory = await this._chatBotRepository.getHistory(userId);
            const model = this._getModel();
            const history = this._buildHistory(dbHistory);
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(dto.message);
            const reply = result.response.text();
            await this._chatBotRepository.appendMessagePair(userId, { role: "user", content: dto.message, createdAt: new Date() }, { role: "assistant", content: reply, createdAt: new Date() });
            logger_1.default.info(`ChatBot ${userId}: ${reply}`);
            return { reply };
        }
        catch (error) {
            logger_1.default.error("Nexus Chatbot Error: ", error);
            throw new AppError_1.default("Failed to get response from AI", 500);
        }
    }
    async chatStream(userId, dto, onChunk, onDone, onError) {
        try {
            const dbHistory = await this._chatBotRepository.getHistory(userId);
            const model = this._getModel();
            const history = this._buildHistory(dbHistory);
            const chat = model.startChat({ history });
            const result = await chat.sendMessageStream(dto.message);
            let fullReply = "";
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    fullReply += text;
                    onChunk(text);
                }
            }
            await this._chatBotRepository.appendMessagePair(userId, { role: "user", content: dto.message, createdAt: new Date() }, { role: "assistant", content: fullReply, createdAt: new Date() });
            logger_1.default.debug(`ChatBot streaming complete ${userId}: ${dto.message}`);
            onDone();
        }
        catch (error) {
            logger_1.default.error(`ChatBot streaming error ${userId}: `, error);
            onError(error);
        }
    }
    async bulkChat(userId, dto) {
        const { items } = dto;
        logger_1.default.debug(`Bulk chat request for user ${userId} with ${items.length} items`);
        const result = [];
        for (let i = 0; i < items.length; i += BULK_CONCURRENCY) {
            const batch = items.slice(i, i + BULK_CONCURRENCY);
            const settled = await Promise.allSettled(batch.map((item) => this.chat(userId, {
                message: item.message,
                history: item.history,
            })
                .catch(() => ({
                reply: "Failed to generate reply",
                tokensUsed: undefined,
            }))
                .then((chatResult) => ({
                id: item.id,
                ...chatResult,
            }))));
            settled.forEach((outcome, idx) => {
                const itemId = batch[idx].id;
                if (outcome.status === "fulfilled") {
                    result.push({
                        id: itemId,
                        reply: outcome.value.reply,
                        tokensUsed: outcome.value.tokensUsed,
                    });
                }
                else {
                    logger_1.default.error(`Bulk chat failed for item ${itemId}: `, outcome.reason);
                    result.push({
                        id: itemId,
                        error: "Failed to generate reply",
                    });
                }
            });
        }
        const totalTokensUsed = result.reduce((sum, curr) => sum + (curr.tokensUsed || 0), 0);
        const successCount = result.filter((r) => !r.error).length;
        const errorCount = result.filter((r) => r.error).length;
        logger_1.default.debug(`Bulk chat completed for user ${userId}: ${successCount}/${result.length} successful`);
        return {
            results: result,
            totalTokensUsed,
            totalItems: result.length,
            successCount,
            errorCount,
        };
    }
    async getHistory(userId) {
        return this._chatBotRepository.getHistory(userId);
    }
    async clearHistory(userId) {
        await this._chatBotRepository.clearHistory(userId);
    }
    _getModel() {
        return this._genAI.getGenerativeModel({
            model: MODEL,
            systemInstruction: SYSTEM_PROMPT,
            safetySettings: [
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });
    }
    _buildHistory(messages) {
        return messages.slice(-20).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));
    }
};
exports.ChatBotService = ChatBotService;
exports.ChatBotService = ChatBotService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.ChatBotRepository)),
    __metadata("design:paramtypes", [Object])
], ChatBotService);
