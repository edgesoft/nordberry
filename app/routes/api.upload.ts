import { json } from "@remix-run/node";
import { s3Client, S3_BUCKET_NAME } from "~/utils/s3.server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Upload } from "@aws-sdk/lib-storage";

export const action = async ({ request }) => {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    return json({ error: "Invalid content type" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const taskId = formData.get("taskId");

  // Konvertera filen till en Buffer endast en gång
  const fileBuffer = Buffer.from(await file.arrayBuffer());


  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${taskId}/${fileName}`;
  const uploadParams = {
    Bucket: "nordberry-stage",
    Key: filePath,
    Body: fileBuffer,
    ContentType: file.type,
  };

  const upload = new Upload({
    client: s3Client,
    params: uploadParams,
  });

  await upload.done();

  return json({
    files: [
      {
        name: file.name,
        url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${filePath}`,
        type: file.type,
        source: "S3",
      },
    ],
  });
};