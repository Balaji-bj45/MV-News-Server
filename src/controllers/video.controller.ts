import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Video from '../models/Video';
import {
  createYoutubeThumbnailUrl,
  extractYoutubeVideoId,
  fetchYoutubeChannelVideos,
} from '../services/youtube.service';

type VideoSourceFilter = 'all' | 'manual' | 'channel';
const LEGACY_DEMO_VIDEO_IDS = ['F40P_fF3QhA', 'Oq511o8y50o', 'R7f8gYyPjA0', 'xP2j3-6g9L4'];

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsedValue) || parsedValue <= 0 ? fallback : parsedValue;
};

const normalizeSourceFilter = (value: unknown): VideoSourceFilter => {
  if (value === 'manual' || value === 'channel') {
    return value;
  }

  return 'all';
};

const slicePaginatedItems = <T>(items: T[], page: number, limit: number) => {
  const startIndex = (page - 1) * limit;
  return items.slice(startIndex, startIndex + limit);
};

const formatPagination = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const manualVideoQuery = {
  youtubeId: { $nin: LEGACY_DEMO_VIDEO_IDS },
  $or: [{ sourceType: 'manual' }, { sourceType: { $exists: false } }],
};

const buildManualVideoPayload = (body: Request['body']) => {
  const youtubeId = extractYoutubeVideoId(body.youtubeId ?? '');

  if (!youtubeId) {
    return null;
  }

  return {
    youtubeId,
    title: String(body.title ?? '').trim(),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    thumbnailUrl: createYoutubeThumbnailUrl(youtubeId),
    tags: Array.isArray(body.tags) ? body.tags : [],
    isFeatureInterview: Boolean(body.isFeatureInterview),
    publishedAt: body.publishedAt || Date.now(),
    sourceType: 'manual' as const,
  };
};

export const getVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parsePositiveNumber(req.query.page, 1);
    const limit = parsePositiveNumber(req.query.limit, 10);
    const source = normalizeSourceFilter(req.query.source);

    if (source === 'channel') {
      const channelVideos = await fetchYoutubeChannelVideos(limit * page);
      const paginatedVideos = slicePaginatedItems(channelVideos, page, limit);

      res.status(200).json({
        success: true,
        message: 'Channel videos fetched successfully',
        data: paginatedVideos,
        pagination: formatPagination(channelVideos.length, page, limit),
      });
      return;
    }

    if (source === 'manual') {
      const total = await Video.countDocuments(manualVideoQuery);
      const videos = await Video.find(manualVideoQuery)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const normalizedVideos = videos.map((video) => ({
        ...video.toObject(),
        sourceType: 'manual' as const,
      }));

      res.status(200).json({
        success: true,
        message: 'Manual videos fetched successfully',
        data: normalizedVideos,
        pagination: formatPagination(total, page, limit),
      });
      return;
    }

    const [channelVideos, manualVideos] = await Promise.all([
      fetchYoutubeChannelVideos(limit * page).catch(() => []),
      Video.find(manualVideoQuery).sort({ publishedAt: -1, createdAt: -1 }),
    ]);

    const combinedVideos = [
      ...channelVideos,
      ...manualVideos.map((video) => ({
        ...video.toObject(),
        sourceType: 'manual' as const,
      })),
    ]
      .sort((firstVideo, secondVideo) => {
        return new Date(secondVideo.publishedAt).getTime() - new Date(firstVideo.publishedAt).getTime();
      })
      .filter((video, index, collection) => {
        return collection.findIndex((candidate) => candidate.youtubeId === video.youtubeId) === index;
      });

    const paginatedVideos = slicePaginatedItems(combinedVideos, page, limit);

    res.status(200).json({
      success: true,
      message: 'Videos fetched successfully',
      data: paginatedVideos,
      pagination: formatPagination(combinedVideos.length, page, limit),
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

    const payload = buildManualVideoPayload(req.body);

    if (!payload) {
      res.status(400).json({ success: false, message: 'Enter a valid YouTube video URL or ID.' });
      return;
    }

    const video = await Video.create(payload);

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
    const existingVideo = await Video.findById(id);

    if (!existingVideo) {
      res.status(404).json({ success: false, message: 'Video not found' });
      return;
    }

    const nextYoutubeId = req.body.youtubeId ? extractYoutubeVideoId(req.body.youtubeId) : existingVideo.youtubeId;

    if (!nextYoutubeId) {
      res.status(400).json({ success: false, message: 'Enter a valid YouTube video URL or ID.' });
      return;
    }

    const updateData = {
      ...req.body,
      youtubeId: nextYoutubeId,
      thumbnailUrl: createYoutubeThumbnailUrl(nextYoutubeId),
      sourceType: 'manual' as const,
    };

    const video = await Video.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

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
