import { json } from "@remix-run/node";
import { S3Storage } from "~/utils/s3.storage.driver.server";


export async function action({ request }: { request: Request }) {
    const formData = await request.formData();
    const rawKey = formData.get("key");
  
    if (typeof rawKey !== "string") {
        console.log("invalid key")
      return json({ success: false, error: "Invalid key" }, { status: 400 });
    }
  
    const key = decodeURIComponent(rawKey); // 🧪 detta fixar problemet
  
    try {
      const s3 = new S3Storage();
      await s3.remove(key);
      console.log("Removed key", key)
      return json({ success: true });
    } catch (err) {
      console.error("Failed to remove from S3", err);
      return json({ success: false, error: "Server error" }, { status: 500 });
    }
  }