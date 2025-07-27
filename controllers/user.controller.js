const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const mediaController = require("./media.controller");
const sharp = require("sharp");

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
            .resize(512, 512, {
                fit: "cover",
            })
            .jpeg({ quality: 80, progressive: true })
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

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password, phone, gender } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const newUser = await User.create({
            name,
            email,
            password,
            phone,
            gender,
        });

        // Send response with token
        res.status(201).json({
            success: true,
            token: generateToken(newUser._id),
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Send response with token
        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");;

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const { name, phone, bio, gender, dob, avatar } = req.body;

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (dob) user.dob = dob;

        if (avatar && typeof avatar === "string" && avatar.startsWith("data:")) {
            if (user.avatar?.fileId) {
                await mediaController
                    .deleteFromImageKit(user.avatar.fileId)
                    .catch((err) =>
                        console.warn(`Failed to delete old avatar:`, err.message)
                    );
            }

            const uploaded = await uploadBase64Media(avatar);
            user.avatar = {
                url: uploaded.url,
                fileId: uploaded.fileId,
            };
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user,
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message,
        });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};
