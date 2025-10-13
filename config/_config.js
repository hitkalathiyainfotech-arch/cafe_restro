import { config } from 'dotenv';
config();

const envConfig = {
  PORT: process.env.PORT || 8000,
  DB_URL: process.env.DB_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_PASS: process.env.SMTP_PASS,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
}


const _config = Object.freeze(envConfig);

export default _config;