import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  title: string;
  slug: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  category: 'india' | 'tamilnadu' | 'candidate' | 'mvnews';
  tags: string[];
  isManual: boolean;
  isFeatured: boolean;
  viewCount: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema = new Schema<INews>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    content: { type: String },
    imageUrl: { type: String },
    source: { type: String, required: true, default: 'Admin' },
    sourceUrl: { type: String, unique: true, sparse: true },
    category: { type: String, enum: ['india', 'tamilnadu', 'candidate', 'mvnews'], required: true },
    tags: [{ type: String }],
    isManual: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ isFeatured: 1, publishedAt: -1 });

export default mongoose.model<INews>('News', newsSchema);
