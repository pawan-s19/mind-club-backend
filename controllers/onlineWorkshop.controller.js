const OnlineWorkshop = require("../models/onlineWorkshop.model");
const mediaController = require("./media.controller");
const sharp = require("sharp");
const jwt = require("jsonwebtoken");

const compressBase64Image = async (base64Image) => {
  try {
    if (
      typeof base64Image !== "string" ||
      !base64Image.startsWith("data:image")
    ) {
      return base64Image;
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    return `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Image compression failed:", error.message);
    throw new Error("Image compression failed.");
  }
};

const uploadBase64Media = async (base64String) => {
  try {
    if (typeof base64String !== "string" || !base64String.startsWith("data:")) {
      return base64String;
    }

    let mediaToUpload = base64String;

    if (base64String.startsWith("data:image")) {
      mediaToUpload = await compressBase64Image(base64String);
    }

    const result = await mediaController.uploadToImageKit(mediaToUpload);
    return result;
  } catch (error) {
    console.error("Error uploading media:", error.message);
    throw error;
  }
};

const processOnlineWorkshopImages = async (data) => {
  const processedData = JSON.parse(JSON.stringify(data));

  const processField = async (fieldValue) => {
    if (
      typeof fieldValue === "object" &&
      fieldValue !== null &&
      fieldValue.url
    ) {
      const result = await processField(fieldValue.url);
      return {
        ...fieldValue,
        url: result.url || result,
        fileId: result.fileId,
      };
    }

    if (typeof fieldValue === "string" && fieldValue.startsWith("data:")) {
      const result = await uploadBase64Media(fieldValue);
      return result;
    }

    return fieldValue;
  };

  // Header
  if (processedData.workshopHeader?.thumbnail) {
    processedData.workshopHeader.thumbnail = await processField(
      processedData.workshopHeader.thumbnail
    );
  }
  if (processedData.workshopHeader?.coverImage) {
    processedData.workshopHeader.coverImage = await processField(
      processedData.workshopHeader.coverImage
    );
  }

  // Projects
  if (
    processedData.projects?.items &&
    Array.isArray(processedData.projects.items)
  ) {
    processedData.projects.items = await Promise.all(
      processedData.projects.items.map(async (project) => ({
        ...project,
        image: await processField(project.image),
      }))
    );
  }

  // Mentors
  if (
    processedData.aboutMentors?.mentors &&
    Array.isArray(processedData.aboutMentors.mentors)
  ) {
    processedData.aboutMentors.mentors = await Promise.all(
      processedData.aboutMentors.mentors.map(async (mentor) => ({
        ...mentor,
        photo: await processField(mentor.photo),
      }))
    );
  }

  return processedData;
};

exports.createOnlineWorkshop = async (req, res) => {
  try {
    const rawData = req.body;

    const {
      workshopHeader,
      price,
      workshopHighlights,
      meetingLink,
      meetingPassword,
    } = rawData;

    console.log(meetingLink, meetingPassword);

    if (
      !workshopHeader?.title ||
      !workshopHeader?.startDate ||
      !workshopHeader?.endDate ||
      !workshopHighlights?.duration ||
      !price?.amount ||
      !meetingLink ||
      !meetingPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const processedData = await processOnlineWorkshopImages(rawData);
    const workshop = await OnlineWorkshop.create(processedData);

    res.status(201).json({
      success: true,
      message: "Online Workshop created successfully",
      data: workshop,
    });
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({
      success: false,
      message: "Creation failed",
      error: error.message,
    });
  }
};

exports.updateOnlineWorkshop = async (req, res) => {
  try {
    const workshopId = req.params.id;
    const rawData = req.body;

    const existingWorkshop = await OnlineWorkshop.findById(workshopId);
    if (!existingWorkshop) {
      return res
        .status(404)
        .json({ success: false, message: "Workshop not found" });
    }

    // Collect old fileIds
    const oldFileIds = [];
    const collectFileIds = (obj) => {
      if (obj && obj.fileId) oldFileIds.push(obj.fileId);
      if (obj && typeof obj === "object")
        Object.values(obj).forEach(collectFileIds);
    };
    collectFileIds(existingWorkshop.toJSON());

    const updatedData = await processOnlineWorkshopImages(rawData);

    const updatedWorkshop = await OnlineWorkshop.findByIdAndUpdate(
      workshopId,
      updatedData,
      { new: true, runValidators: true }
    );

    // Delete unused old fileIds
    const newFileIds = new Set();
    const collectNewFileIds = (obj) => {
      if (obj && obj.fileId) newFileIds.add(obj.fileId);
      if (obj && typeof obj === "object")
        Object.values(obj).forEach(collectNewFileIds);
    };
    collectNewFileIds(updatedWorkshop.toJSON());

    const fileIdsToDelete = oldFileIds.filter((id) => !newFileIds.has(id));
    await Promise.all(
      fileIdsToDelete.map((id) =>
        mediaController
          .deleteFromImageKit(id)
          .catch((err) =>
            console.warn(`Failed to delete fileId ${id}:`, err.message)
          )
      )
    );

    res.status(200).json({
      success: true,
      message: "Workshop updated successfully",
      data: updatedWorkshop,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Update failed", error: error.message });
  }
};

exports.getAllOnlineWorkshops = async (req, res) => {
  try {
    const workshops = await OnlineWorkshop.find()
      .sort({ createdAt: -1 })
      .lean();
    res
      .status(200)
      .json({ success: true, count: workshops.length, data: workshops });
  } catch (error) {
    console.error("Fetch All Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Fetch failed", error: error.message });
  }
};

exports.getOnlineWorkshop = async (req, res) => {
  try {
    const workshop = await OnlineWorkshop.findById(req.params.id).lean();
    let token, user;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id).select("-password");
    }

    if (!workshop) {
      return res
        .status(404)
        .json({ success: false, message: "Workshop not found" });
    }

    let isEnrolled = false;
    if (user._id) {
      const Enrollment = require("../models/Enrollment.model");
      isEnrolled = await Enrollment.exists({
        user: user._id,
        workshop: req.params.id,
      });
    }

    if (!isEnrolled) {
      workshop.meetingID = undefined; // Hide meeting id if not enrolled
      workshop.meetingPassword = undefined; // Hide meeting password if not enrolled
    }

    res.status(200).json({ success: true, data: workshop });
  } catch (error) {
    console.error("Fetch Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Fetch failed", error: error.message });
  }
};

exports.deleteOnlineWorkshop = async (req, res) => {
  try {
    const workshop = await OnlineWorkshop.findById(req.params.id);
    if (!workshop) {
      return res
        .status(404)
        .json({ success: false, message: "Workshop not found" });
    }

    const fileIdsToDelete = [];
    const collectFileIds = (obj) => {
      if (obj && obj.fileId) fileIdsToDelete.push(obj.fileId);
      if (obj && typeof obj === "object")
        Object.values(obj).forEach(collectFileIds);
    };
    collectFileIds(workshop.toJSON());

    await Promise.all(
      fileIdsToDelete.map((fileId) =>
        mediaController
          .deleteFromImageKit(fileId)
          .catch((err) =>
            console.warn(`Failed to delete fileId ${fileId}:`, err.message)
          )
      )
    );

    await workshop.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Workshop deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({
      success: false,
      message: "Deletion failed",
      error: error.message,
    });
  }
};
