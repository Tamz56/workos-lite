import { NextResponse } from "next/server";
import { seedArborWritingLab } from "@/db/db";

export async function POST() {
  try {
    seedArborWritingLab();
    return NextResponse.json({ success: true, message: "Arbor Writing Lab seeded successfully" });
  } catch (error: any) {
    console.error("Seeding failed", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
