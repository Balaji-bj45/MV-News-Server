import { Request, Response, NextFunction } from 'express';
import Advertisement from '../models/Advertisement';
import cloudinary from '../config/cloudinary';

export const getAdvertisements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position } = req.query;
    const query: any = {};
    if (position) {
      query.position = position;
    }

    const ads = await Advertisement.find(query).sort({ position: 1, displayOrder: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: 'Advertisements fetched successfully',
      data: ads,
    });
  } catch (error) {
    next(error);
  }
};

export const createAdvertisement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position, imageUrl, publicId, targetUrl, isActive, displayOrder } = req.body;

    const ad = await Advertisement.create({
      position,
      imageUrl,
      publicId,
      targetUrl,
      isActive,
      displayOrder,
    });

    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdvertisement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { position, imageUrl, publicId, targetUrl, isActive, displayOrder } = req.body;

    const existingAd = await Advertisement.findById(id);

    if (!existingAd) {
      res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
      return;
    }

    const previousPublicId = existingAd.publicId;
    const nextPublicId = typeof publicId === 'string' ? publicId : existingAd.publicId;
    const nextImageUrl = typeof imageUrl === 'string' ? imageUrl : existingAd.imageUrl;

    existingAd.position = position ?? existingAd.position;
    existingAd.imageUrl = nextImageUrl;
    existingAd.publicId = nextPublicId;
    existingAd.targetUrl = typeof targetUrl === 'string' ? targetUrl : targetUrl === '' ? '' : existingAd.targetUrl;
    existingAd.isActive = typeof isActive === 'boolean' ? isActive : existingAd.isActive;
    existingAd.displayOrder = typeof displayOrder === 'number' ? displayOrder : existingAd.displayOrder;

    await existingAd.save();

    if (previousPublicId && nextPublicId !== previousPublicId) {
      await cloudinary.uploader.destroy(previousPublicId).catch(() => null);
    }

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: existingAd,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdvertisement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const ad = await Advertisement.findById(id);

    if (!ad) {
      res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
      return;
    }

    if (ad.publicId) {
      await cloudinary.uploader.destroy(ad.publicId).catch(() => null);
    }

    await ad.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully',
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};
