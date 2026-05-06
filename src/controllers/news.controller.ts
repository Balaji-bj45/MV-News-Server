import { Request, Response, NextFunction } from 'express';
import News from '../models/News';
import { generateSlug } from '../utils/slugify';
import { validationResult } from 'express-validator';

export const getNews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const isFeatured = req.query.isFeatured;

    const query: any = {};

    if (category) query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await News.countDocuments(query);
    const news = await News.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'News fetched successfully',
      data: news,
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

export const getNewsBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const news = await News.findOneAndUpdate(
      { slug },
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!news) {
      res.status(404).json({ success: false, message: 'News not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News fetched successfully',
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

export const createNews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { title, description, content, imageUrl, source, sourceUrl, category, tags, isFeatured, publishedAt } = req.body;

    let slug = generateSlug(title);
    
    // Ensure slug uniqueness
    const existing = await News.findOne({ slug });
    if (existing) {
       slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const news = await News.create({
      title,
      slug,
      description,
      content,
      imageUrl,
      source: source || 'Admin',
      sourceUrl,
      category,
      tags,
      isManual: true,
      isFeatured: isFeatured || false,
      publishedAt: publishedAt || Date.now(),
    });

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

export const updateNews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { id } = req.params;
    let updateData = { ...req.body };

    if (updateData.title) {
      updateData.slug = generateSlug(updateData.title);
      const existing = await News.findOne({ slug: updateData.slug, _id: { $ne: id } });
      if (existing) {
        updateData.slug = `${updateData.slug}-${Math.random().toString(36).substring(2, 8)}`;
      }
    }

    const news = await News.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!news) {
      res.status(404).json({ success: false, message: 'News not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News updated successfully',
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const news = await News.findByIdAndDelete(id);

    if (!news) {
      res.status(404).json({ success: false, message: 'News not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFeatureNews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
      res.status(404).json({ success: false, message: 'News not found' });
      return;
    }

    news.isFeatured = !news.isFeatured;
    await news.save();

    res.status(200).json({
      success: true,
      message: `News ${news.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: news,
    });
  } catch (error) {
    next(error);
  }
};
