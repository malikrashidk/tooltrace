import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// These will be provided via environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Initialize S3 client only if credentials are present
let s3Client: S3Client | null = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function uploadToR2(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
  if (!s3Client || !R2_BUCKET_NAME) {
    throw new Error("R2 storage is not configured");
  }

  const key = `${Date.now()}-${fileName}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  // Return the key (or a public URL if you have a custom domain set up)
  // For signed URLs, we usually return just the key and generate the URL on read
  return key;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!s3Client || !R2_BUCKET_NAME) {
    throw new Error("R2 storage is not configured");
  }

  await s3Client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
}

export async function getR2DownloadUrl(key: string): Promise<string> {
  if (!s3Client || !R2_BUCKET_NAME) {
    throw new Error("R2 storage is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  // Generate a signed URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
