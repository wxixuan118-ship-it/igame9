import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@starter/env/server";
export async function createBlogImageUpload(contentType: string) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL } =
    env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL)
    throw new Error("Image upload is not configured (R2_* variables)");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  if (!contentType.startsWith("image/")) throw new Error("Images only");
  const key = `blog/${crypto.randomUUID()}`;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { uploadUrl, publicUrl: `${R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}` };
}
