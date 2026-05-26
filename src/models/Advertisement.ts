import mongoose, { Document, Schema } from 'mongoose';

export interface IAdvertisement extends Document {
  position: 'top_banner' | 'sidebar_banner';
  imageUrl: string;
  publicId?: string;
  targetUrl?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const advertisementSchema = new Schema<IAdvertisement>(
  {
    position: {
      type: String,
      enum: ['top_banner', 'sidebar_banner'],
      required: true,
    },
    imageUrl: { type: String, required: true },
    publicId: { type: String },
    targetUrl: { type: String },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

advertisementSchema.index({ position: 1, displayOrder: 1, createdAt: 1 });

export default mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
