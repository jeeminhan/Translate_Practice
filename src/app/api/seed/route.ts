import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed-demo";
import { getAuthUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = await seedDemo(user.id);
    return NextResponse.json({ videoId, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
