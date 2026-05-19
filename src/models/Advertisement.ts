import mongoose, { Document, Schema } from 'mongoose';

export interface IAdvertisement extends Document {
  position: 'top_banner' | 'sidebar_banner';
  imageUrl: string;
  targetUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const advertisementSchema = new Schema<IAdvertisement>(
  {
    position: {
      type: String,
      enum: ['top_banner', 'sidebar_banner'],
      required: true,
      unique: true,
    },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
