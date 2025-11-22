import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (kind !== "user" && kind !== "team") {
      return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Max 2MB." },
        { status: 400 }
      );
    }

    const folder = kind === "user" ? "avatars/users" : "avatars/teams";

    const uniqueName = `${folder}/${crypto.randomUUID()}`;
    const blob = await put(uniqueName, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}