import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getR2Client() {
  if (!ENV.r2Endpoint || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey || !ENV.r2Bucket) return null;
  return new S3Client({
    region: "auto",
    endpoint: ENV.r2Endpoint,
    credentials: { accessKeyId: ENV.r2AccessKeyId, secretAccessKey: ENV.r2SecretAccessKey },
  });
}

export function isR2Configured() {
  return Boolean(getR2Client());
}

export async function createR2UploadUrl(accountId: number, filename: string, contentType: string) {
  const client = getR2Client();
  if (!client) throw new Error("R2_NOT_CONFIGURED");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const key = `aaa-mvp/driver-documents/${accountId}/${randomUUID()}-${safeName}`;
  const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: ENV.r2Bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
  return { key, url, expiresIn: 300 };
}

export async function createR2DownloadUrl(key: string) {
  const client = getR2Client();
  if (!client) throw new Error("R2_NOT_CONFIGURED");
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: ENV.r2Bucket, Key: key }), { expiresIn: 300 });
  return { url, expiresIn: 300 };
}
