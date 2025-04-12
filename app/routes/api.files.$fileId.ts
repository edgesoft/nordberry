import { LoaderFunction } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { prisma } from "../utils/db.server";
import { s3Client } from "../utils/s3.server";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) return new Response("Unauthorized", { status: 401 });

    const { params, request } = args

  const file = await prisma.file.findUnique({
    where: { id: params.fileId },
    include: {
      comment: {
        include: {
          task: {
            include: {
              assignments: true,
            },
          },
        },
      },
    },
  });

  if (!file || file.source !== "S3") {
    return new Response("File not found or invalid source", { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: "nordberry-stage",
    Key: file.url.replace(/^https:\/\/[^/]+\/+/, ""), // eller spara key separat
  });

  const s3Response = await s3Client.send(command);
  const body = await streamToBuffer(s3Response.Body);

  return new Response(body, {
    headers: {
      "Content-Type": file.type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
        file.name
      )}`,
    },
  });
};

export async function streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }