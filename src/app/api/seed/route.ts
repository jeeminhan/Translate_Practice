import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed-demo";

export async function POST() {
  try {
    const videoId = await seedDemo();
    return NextResponse.json({ videoId, success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to seed demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
