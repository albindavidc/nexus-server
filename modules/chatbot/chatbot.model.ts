import { model, Schema, Types, Document } from "mongoose";

export interface IAIMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IAIConversation {
  user: Types.ObjectId;
  messages: IAIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAIConversationDocument extends IAIConversation, Document {}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Message cannot be longer than 200 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const aiConversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [aiMessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

aiConversationSchema.pre<IAIConversationDocument>("save", function () {
  if (this.messages.length > 200) {
    this.messages = this.messages.slice(-200);
  }
});

const AIConversation = model<IAIConversationDocument>(
  "AIConversation",
  aiConversationSchema,
);

export default AIConversation;
