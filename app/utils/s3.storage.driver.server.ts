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

import { s3Client, S3_BUCKET_NAME } from "./s3.server";



export class S3Storage implements FileStorage {
  bucket = S3_BUCKET_NAME;

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
