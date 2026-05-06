import { Request, Response, NextFunction } from 'express';
import Video from '../models/Video';
import { validationResult } from 'express-validator';

export const getVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const total = await Video.countDocuments();
    const videos = await Video.find()
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Videos fetched successfully',
      data: videos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Video fetched successfully',
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

export const createVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { youtubeId, title, description, tags, isFeatureInterview, publishedAt } = req.body;

    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    const video = await Video.create({
      youtubeId,
      title,
      description,
      thumbnailUrl,
      tags,
      isFeatureInterview: isFeatureInterview || false,
      publishedAt: publishedAt || Date.now(),
    });

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { id } = req.params;
    
    let updateData = { ...req.body };
    if (updateData.youtubeId) {
       updateData.thumbnailUrl = `https://img.youtube.com/vi/${updateData.youtubeId}/maxresdefault.jpg`;
    }

    const video = await Video.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
