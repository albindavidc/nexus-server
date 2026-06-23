"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Otp = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const otpSchema = new mongoose_1.default.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300,
    },
});
otpSchema.pre("save", async function () {
    if (!this.isModified("otp"))
        return;
    const salt = await bcryptjs_1.default.genSalt(10);
    this.otp = await bcryptjs_1.default.hash(this.otp, salt);
});
otpSchema.methods.compareOtp = async function (candidateOtp) {
    return bcryptjs_1.default.compare(candidateOtp, this.otp);
};
exports.Otp = mongoose_1.default.model("Otp", otpSchema);
