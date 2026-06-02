import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidate extends Document {
  name: string;
  nameInTamil: string;
  party: string;
  constituency: string;
  photoUrl?: string;
  bio?: string;
  bioInTamil?: string;
  promises: { title: string; description: string }[];
  timeline: { date: Date; event: string }[];
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
    whatsapp?: string;
  };
  isActive: boolean;
  isMainCandidate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true },
    nameInTamil: { type: String, required: true },
    party: { type: String, required: true },
    constituency: { type: String, required: true },
    photoUrl: { type: String },
    bio: { type: String },
    bioInTamil: { type: String },
    promises: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
    timeline: [
      {
        date: { type: Date, required: true },
        event: { type: String, required: true },
      },
    ],
    socialLinks: {
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      facebook: { type: String },
      whatsapp: { type: String },
    },
    isActive: { type: Boolean, default: true },
    isMainCandidate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ICandidate>('Candidate', candidateSchema);
