import { S3Client } from "@aws-sdk/client-s3";
import _config from "../config/_config.js";

export const s3 = new S3Client({
  region: _config.S3_REGION,
  credentials: {
    accessKeyId: _config.S3_ACCESS_KEY,
    secretAccessKey: _config.S3_SECRET_KEY,
  },
  forcePathStyle: false,
});
