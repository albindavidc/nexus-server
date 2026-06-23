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
const tsyringe_1 = require("tsyringe");
const auth_model_1 = __importDefault(require("./auth.model"));
let AuthRepository = class AuthRepository {
    async findByUsernameOrEmail(username, email) {
        return auth_model_1.default.findOne({
            $or: [{ username }, { email }],
        });
    }
    async findByEmailWithPassword(email) {
        return auth_model_1.default.findOne({ email }).select("+password");
    }
    async findById(userId) {
        return auth_model_1.default.findById(userId);
    }
    async findByEmail(email) {
        return auth_model_1.default.findOne({ email });
    }
    async createUser(data) {
        return auth_model_1.default.create(data);
    }
    async updateUser(userId, data) {
        return auth_model_1.default.findByIdAndUpdate(userId, data, { new: true });
    }
    async saveUser(user) {
        return user.save({ validateBeforeSave: false });
    }
    async searchUsers(query, excludeUserId) {
        return auth_model_1.default.find({
            _id: { $ne: excludeUserId },
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } }
            ]
        }).limit(20);
    }
};
AuthRepository = __decorate([
    (0, tsyringe_1.injectable)()
], AuthRepository);
exports.default = AuthRepository;
