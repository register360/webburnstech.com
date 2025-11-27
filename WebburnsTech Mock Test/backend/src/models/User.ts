import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  dob: Date;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  city: string;
  state: string;
  status: 'pending' | 'verified' | 'accepted' | 'rejected';
  otp?: {
    code: string;
    expiresAt: Date;
  };
  examCredentials?: {
    username: string;
    password: string;
  };
  registeredAt: Date;
  verifiedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  credentialsSentAt?: Date;
  adminNotes?: string;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  motherName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'verified', 'accepted', 'rejected'], default: 'pending' },
  otp: {
    code: String,
    expiresAt: Date
  },
  examCredentials: {
    username: String,
    password: String
  },
  registeredAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  credentialsSentAt: Date,
  adminNotes: String
});

userSchema.index({ email: 1 });
userSchema.index({ status: 1 });

export default mongoose.model<IUser>('User', userSchema);
