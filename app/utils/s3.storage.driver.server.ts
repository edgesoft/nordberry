import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { FileStorage } from "@mjackson/file-storage";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export class S3Storage implements FileStorage {
  bucket = "my-bucket";

  async has(key: string): Promise<boolean> {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      return true;
    } catch (error) {
      if (error instanceof NotFound) {
        return false;
      }
      console.error(
        `Failed to check for a file ${key} in bucket ${this.bucket}`,
        error
      );
      return false;
    }
  }

  async get(key: string): Promise<File | null> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      if (!response.Body) {
        return null;
      }
      const bytes = await response.Body.transformToByteArray();
      return new File([bytes], key, {
        type: response.ContentType,
        lastModified: response.LastModified?.getTime(),
      });
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      console.error(
        `Failed to get a file ${key} in bucket ${this.bucket}`,
        error
      );
      return null;
    }
  }

  async set(key: string, value: File): Promise<void> {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: value,
          ContentType: value.type,
        })
      );
    } catch (error) {
      console.error(
        `Failed to set a file ${key} in bucket ${this.bucket}`,
        error
      );
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (error) {
      console.error(
        `Failed to remove a file ${key} in bucket ${this.bucket}`,
        error
      );
    }
  }
}
