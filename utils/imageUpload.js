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

exports = {
    compressBase64Image,
    uploadBase64Media,
    processOnlineWorkshopImages
};
