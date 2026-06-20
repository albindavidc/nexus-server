import mongoose, { Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IOtp extends Document {
  email: string;
  otp: string;
  createdAt: Date;
  compareOtp: (candidateOtp: string) => Promise<boolean>;
}

const otpSchema = new mongoose.Schema({
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

otpSchema.pre<IOtp>("save", async function () {
  if (!this.isModified("otp")) return;

  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

otpSchema.methods.compareOtp = async function (candidateOtp: string) {
  return bcrypt.compare(candidateOtp, this.otp);
};

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
