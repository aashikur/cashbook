/**
 * Cloudflare R2 Object Storage Service (S3 Compatible)
 * Docs ref: §2.5 Zero-Egress Receipt Storage, §3.6 Cloudflare R2 Uploads
 *
 * All operations use short-lived presigned URLs for client PUT,
 * ensuring zero Next.js server egress overhead and 15-year longevity.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "cashbook-receipts";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || ""; // e.g., https://media.yourcashbook.com

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface PresignUploadParams {
  orgId: string;
  fiscalYear: number;
  fiscalMonth: number;
  fileUuid: string;
  mimeType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generates a presigned URL for direct client PUT upload to Cloudflare R2.
 * Key convention: orgs/{orgId}/{fiscalYear}/{fiscalMonth}/{uuid}.webp
 */
export async function createPresignedUploadUrl({
  orgId,
  fiscalYear,
  fiscalMonth,
  fileUuid,
  mimeType,
  expiresInSeconds = 300, // 5 minutes
}: PresignUploadParams): Promise<PresignUploadResult> {
  const extension = mimeType === "application/pdf" ? "pdf" : "webp";
  const key = `orgs/${orgId}/${fiscalYear}/${fiscalMonth}/${fileUuid}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });

  const publicUrl = R2_PUBLIC_DOMAIN
    ? `${R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${key}`
    : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

/**
 * Deletes a receipt attachment object from R2.
 */
export async function deleteR2Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  await r2Client.send(command);
}
