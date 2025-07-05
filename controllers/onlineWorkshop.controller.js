const OnlineWorkshop = require('../models/onlineWorkshop.model');
const mediaController = require('./media.controller');
const sharp = require('sharp');


const compressBase64Image = async (base64Image) => {
  try {
    if (typeof base64Image !== 'string' || !base64Image.startsWith('data:image')) {
      return base64Image;
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Image compression failed:', error.message);
    throw new Error('Image compression failed. The provided image data may be corrupt or incomplete.');
  }
};

const uploadBase64Media = async (base64String) => {
  try {
    if (typeof base64String !== 'string' || !base64String.startsWith('data:')) {
      console.log('Skipping upload - not a base64 string');
      return base64String;
    }

    let mediaToUpload = base64String;

    if (base64String.startsWith('data:image')) {
      console.log('Compressing image before upload...');
      mediaToUpload = await compressBase64Image(base64String);
      console.log('Image compression completed');
    }

    const result = await mediaController.uploadToImageKit(mediaToUpload);
    console.log('Upload successful:', result.url);
    return result;
  } catch (error) {
    console.error('Error in uploadBase64Media:', error.message);
    throw error;
  }
};

const processOnlineWorkshopImages = async (data) => {
  console.log('Starting image processing for Online Workshop...');
  const processedData = JSON.parse(JSON.stringify(data)); // Deep clone

  const processField = async (fieldValue) => {
    if (typeof fieldValue === 'object' && fieldValue !== null && fieldValue.url) {
      const urlResult = await processField(fieldValue.url);
      return {
        ...fieldValue,
        url: urlResult.url || urlResult,
        fileId: urlResult.fileId,
      };
    }

    if (typeof fieldValue === 'string' && fieldValue.startsWith('data:')) {
      try {
        const result = await uploadBase64Media(fieldValue);
        return result;
      } catch (error) {
        console.error('Failed to process media field:', error.message);
        throw error;
      }
    }

    return fieldValue;
  };

  try {
    // 🔹 Process workshopHeader.thumbnail and coverImage
    if (processedData.workshopHeader?.thumbnail) {
      processedData.workshopHeader.thumbnail = await processField(processedData.workshopHeader.thumbnail);
    }

    if (processedData.workshopHeader?.coverImage) {
      processedData.workshopHeader.coverImage = await processField(processedData.workshopHeader.coverImage);
    }

    // 🔹 Process projects[].image
    if (Array.isArray(processedData.projects)) {
      processedData.projects = await Promise.all(
        processedData.projects.map(async (project) => ({
          ...project,
          image: await processField(project.image),
        }))
      );
    }

    // 🔹 Process mentors[].photo
    if (Array.isArray(processedData.mentors)) {
      processedData.mentors = await Promise.all(
        processedData.mentors.map(async (mentor) => ({
          ...mentor,
          photo: await processField(mentor.photo),
        }))
      );
    }

    console.log('Online Workshop image processing completed successfully');
    return processedData;
  } catch (error) {
    console.error('Error in processOnlineWorkshopImages:', error.message);
    throw error;
  }
};

exports.createOnlineWorkshop = async (req, res) => {
    try {
        const rawData = req.body;

        const {
            workshopHeader,
            price,
            workshopHighlights,
            meetingLink
        } = rawData;

        if (
            !workshopHeader?.title ||
            !workshopHeader?.startDate ||
            !workshopHeader?.endDate ||
            !workshopHighlights?.duration ||
            !price?.amount ||
            !meetingLink
        ) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, startDate, endDate, duration, price.amount, or meetingLink',
            });
        }

        const processedData = await processOnlineWorkshopImages(rawData);

        const workshop = new OnlineWorkshop(processedData);
        await workshop.save();

        return res.status(201).json({
            success: true,
            message: 'Online Workshop created successfully.',
            data: workshop,
        });

    } catch (error) {
        console.error('Create Online Workshop Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create online workshop',
            error: error.message,
        });
    }
};

exports.updateOnlineWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    const existingWorkshop = await OnlineWorkshop.findById(workshopId);

    if (!existingWorkshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
    }

    const rawData = req.body;

    // ✅ Validate required nested fields
    if (
      !rawData.workshopHeader?.title ||
      !rawData.workshopHeader?.startDate ||
      !rawData.workshopHeader?.endDate ||
      !rawData.workshopHighlights?.duration ||
      !rawData.price?.amount ||
      !rawData.meetingLink
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workshopHeader.title, workshopHeader.startDate, workshopHeader.endDate, workshopHighlights.duration, price.amount, or meetingLink',
      });
    }

    // --- Step 1: Collect old fileIds for cleanup ---
    const oldFileIds = [];
    const collectFileIds = (obj) => {
      if (obj && obj.fileId) oldFileIds.push(obj.fileId);
      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(collectFileIds);
      }
    };
    collectFileIds(existingWorkshop.toJSON());

    // --- Step 2: Process new media uploads ---
    const updatedData = await processOnlineWorkshopImages(rawData);

    // --- Step 3: Update DB ---
    const updatedWorkshop = await OnlineWorkshop.findByIdAndUpdate(
      workshopId,
      updatedData,
      { new: true, runValidators: true }
    );

    // --- Step 4: Clean up unused old images ---
    const newFileIds = new Set();
    const collectNewFileIds = (obj) => {
      if (obj && obj.fileId) newFileIds.add(obj.fileId);
      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(collectNewFileIds);
      }
    };
    collectNewFileIds(updatedWorkshop.toJSON());

    const fileIdsToDelete = oldFileIds.filter(id => !newFileIds.has(id));

    if (fileIdsToDelete.length > 0) {
      await Promise.all(
        fileIdsToDelete.map(id =>
          mediaController.deleteFromImageKit(id).catch(err =>
            console.warn(`Failed to delete fileId ${id}:`, err.message)
          )
        )
      );
    }

    res.status(200).json({
      success: true,
      message: 'Workshop updated successfully',
      data: updatedWorkshop,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workshop',
      error: error.message,
    });
  }
};

exports.getAllOnlineWorkshops = async (req, res) => {
    try {
        const workshops = await OnlineWorkshop.find().sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            success: true,
            count: workshops.length,
            data: workshops,
        });
    } catch (error) {
        console.error('Error fetching workshops:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch workshops',
            error: error.message,
        });
    }
};

exports.getOnlineWorkshop = async (req, res) => {
    try {
        const { id } = req.params;

        const workshop = await OnlineWorkshop.findById(id).lean();

        if (!workshop) {
            return res.status(404).json({
                success: false,
                message: 'Workshop not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: workshop,
        });
    } catch (error) {
        console.error('Error fetching single workshop:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch workshop',
            error: error.message,
        });
    }
};

exports.deleteOnlineWorkshop = async (req, res) => {
  try {
    const { id } = req.params;

    const workshop = await OnlineWorkshop.findById(id);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
    }

    // 🔄 Step 1: Collect fileIds to delete
    const fileIdsToDelete = [];

    const collectFileIds = (obj) => {
      if (obj && obj.fileId) fileIdsToDelete.push(obj.fileId);
      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(collectFileIds);
      }
    };

    // Recursively collect from entire document (including nested image objects)
    collectFileIds(workshop.toJSON());

    // 🧹 Step 2: Delete images from ImageKit
    if (fileIdsToDelete.length > 0) {
      await Promise.all(
        fileIdsToDelete.map((fileId) =>
          mediaController.deleteFromImageKit(fileId).catch((err) =>
            console.warn(`Failed to delete fileId ${fileId}:`, err.message)
          )
        )
      );
    }

    // ❌ Step 3: Delete the workshop document
    await workshop.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Workshop deleted successfully',
    });
  } catch (error) {
    console.error('Delete Online Workshop Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete online workshop',
      error: error.message,
    });
  }
};

