import mongoose, { Document, Schema } from 'mongoose';

export interface IAppNotification extends Document {
  userId: mongoose.Types.ObjectId | string;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appNotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'system',
      enum: ['system', 'message', 'group', 'alert'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedEntityId: {
      type: String,
    },
  },
  { timestamps: true },
);

export const AppNotification = mongoose.model<IAppNotification>(
  'AppNotification',
  appNotificationSchema,
);
