"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../shared/utils/logger"));
async function connectDatabase() {
    try {
        const uri = process.env.MONGO_URI;
        const connection = await mongoose_1.default.connect(uri);
        logger_1.default.info(`\n===============================================\n🚀 Database Connected: ${connection.connection.host}\n===============================================`);
        const db = connection.connection.db;
        if (db) {
            const collections = await db.listCollections().toArray();
            const hasGroupConversations = collections.some((col) => col.name === "groupconversations");
            if (hasGroupConversations) {
                logger_1.default.info("Migration: Found 'groupconversations' collection. Migrating to 'conversations'...");
                const groupCol = db.collection("groupconversations");
                const convCol = db.collection("conversations");
                const groups = await groupCol.find({}).toArray();
                for (const group of groups) {
                    const exists = await convCol.findOne({ _id: group._id });
                    if (!exists) {
                        await convCol.insertOne(group);
                        logger_1.default.info(`Migration: Migrated group '${group.name}' (${group._id})`);
                    }
                }
                await groupCol.drop();
                logger_1.default.info("Migration: 'groupconversations' collection dropped successfully.");
            }
        }
    }
    catch (error) {
        logger_1.default.error("Database connection failed:", error);
        process.exit(1);
    }
}
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
    logger_1.default.info("Database disconnected.");
}
