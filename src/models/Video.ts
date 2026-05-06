import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  youtubeId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: Date;
  tags: string[];
  isFeatureInterview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    youtubeId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    thumbnailUrl: { type: String },
    publishedAt: { type: Date, default: Date.now },
    tags: [{ type: String }],
    isFeatureInterview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>('Video', videoSchema);
