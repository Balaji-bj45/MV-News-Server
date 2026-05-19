import { Request, Response, NextFunction } from 'express';
import Advertisement from '../models/Advertisement';

export const getAdvertisements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position } = req.query;
    const query: any = {};
    if (position) {
      query.position = position;
    }

    const ads = await Advertisement.find(query);

    res.status(200).json({
      success: true,
      message: 'Advertisements fetched successfully',
      data: ads,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdvertisement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { position } = req.params;
    const { imageUrl, targetUrl, isActive } = req.body;

    const ad = await Advertisement.findOneAndUpdate(
      { position },
      { $set: { imageUrl, targetUrl, isActive } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};
