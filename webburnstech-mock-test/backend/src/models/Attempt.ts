import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  qId: mongoose.Types.ObjectId;
  selectedIndex: number;
  savedAt: Date;
  isMarkedForReview: boolean;
}

export interface ICheatingEvent {
  type: 'tabChange' | 'copy' | 'paste' | 'unauthorizedFocus' | 'multipleTabs';
  time: Date;
  details: string;
}

export interface IAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  examDate: string;
  startAt: Date;
  endAt: Date;
  submittedAt?: Date;
  durationSec: number;
  answers: IAnswer[];
  score?: number;
  autoSubmitted: boolean;
  cheatingEvents: ICheatingEvent[];
  logs: any[];
  singleSessionKey: string;
}

const attemptSchema = new Schema<IAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  examDate: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  submittedAt: Date,
  durationSec: { type: Number, default: 7200 }, // 2 hours in seconds
  answers: [{
    qId: { type: Schema.Types.ObjectId, ref: 'Question' },
    selectedIndex: Number,
    savedAt: Date,
    isMarkedForReview: Boolean
  }],
  score: Number,
  autoSubmitted: { type: Boolean, default: false },
  cheatingEvents: [{
    type: { type: String, required: true },
    time: { type: Date, default: Date.now },
    details: String
  }],
  logs: [Schema.Types.Mixed],
  singleSessionKey: { type: String, required: true }
});

attemptSchema.index({ userId: 1 });
attemptSchema.index({ startAt: 1 });

export default mongoose.model<IAttempt>('Attempt', attemptSchema);
