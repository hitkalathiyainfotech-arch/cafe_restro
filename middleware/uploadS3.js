import multer from "multer";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import _config from "../config/_config.js";
import log from "../utils/logger.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

export const s3 = new S3Client({
  region: _config.S3_REGION, // MUST match bucket region
  credentials: {
    accessKeyId: _config.S3_ACCESS_KEY,
    secretAccessKey: _config.S3_SECRET_KEY,
  },
  forcePathStyle: false, // false for standard S3 buckets
});


export const uploadToS3 = async (buffer, filename, mimetype, folder = "uploads") => {
  try {
    if (!buffer) throw new Error("Missing file buffer");

    // Clean filename and make it unique
    const safeName = filename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const key = `${folder}/${Date.now()}_${safeName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: _config.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype || "application/octet-stream"
      })
    );

    // Return direct S3 file URL
    return `https://${_config.S3_BUCKET_NAME}.s3.${_config.S3_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error("Failed to upload to S3");
  }
};


/**
 * Optional helper: resize image buffer with Sharp before uploading
 * @param {Buffer} buffer 
 * @param {Object} options - { width, height, quality }
 * @returns {Buffer}
 */
export const resizeImage = async (buffer, options = { width: 1024, height: 768, quality: 80 }) => {
  try {
    return await sharp(buffer)
      .resize(options.width, options.height)
      .jpeg({ quality: options.quality })
      .toBuffer();
  } catch (error) {
    log.error("Sharp Resize Error:", error);
    throw new Error("Failed to process image");
  }
};


export const listAllS3Images = async () => {
  try {
    let continuationToken = undefined;
    let allUrls = [];

    do {
      const params = {
        Bucket: _config.S3_BUCKET_NAME,
        ContinuationToken: continuationToken,
      };

      const command = new ListObjectsV2Command(params);
      const response = await s3.send(command);

      if (response.Contents) {
        const urls = response.Contents.map(
          (item) => `https://${_config.S3_BUCKET_NAME}.s3.${_config.S3_REGION}.amazonaws.com/${item.Key}`
        );
        allUrls = allUrls.concat(urls);
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return allUrls;
  } catch (error) {
    log.error("❌ Failed to list all S3 images", error);
    throw error;
  }
};



// **
//  * Delete a file from S3
//  * @param {string} key - The S3 object key (e.g., "hotels/1697201234567_image.jpg")
//  */

// const imageUrl = "https://my-bucket.s3.eu-north-1.amazonaws.com/hotels/1697201234567_image.jpg";

// // Extract key from URL
// const key = imageUrl.split(".amazonaws.com/")[1]; 
// // key = "hotels/1697201234567_image.jpg"

// await deleteFromS3(key);


export const deleteFromS3 = async (key) => {
  if (!key) throw new Error("S3 object key is required for deletion");

  const command = new DeleteObjectCommand({
    Bucket: _config.S3_BUCKET_NAME,
    Key: key,
  });

  try {
    await s3.send(command);
    log.success(`✅ Successfully deleted S3 file: ${key}`);
    return true;
  } catch (error) {
    log.error(`❌ Failed to delete S3 file: ${key}`, error);
    throw error;
  }
};
