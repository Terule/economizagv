import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.SEAWEEDFS_BUCKET ?? "economizagv";
const endpoint = process.env.SEAWEEDFS_S3_ENDPOINT ?? "http://localhost:8333";

const client = new S3Client({
  endpoint,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY ?? "economizagv",
    secretAccessKey:
      process.env.SEAWEEDFS_SECRET_KEY ?? "troque-esta-chave-em-producao",
  },
});

let bucketReady: Promise<void> | undefined;
async function ensureBucket() {
  bucketReady ??= (async () => {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  })();
  return bucketReady;
}

export async function putTemporaryReceipt(file: File) {
  await ensureBucket();
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const key = `receipts/pending/${randomUUID()}${extension.toLowerCase()}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type || "application/octet-stream",
    }),
  );
  return key;
}

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getObject(key: string) {
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
