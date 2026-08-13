import { NextRequest, NextResponse } from "next/server";
import { seedArborWritingLab } from "@/db/db";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";

export async function POST(req: NextRequest) {
  const authGuard = humanMutationGuard(req);
  if (authGuard instanceof NextResponse) return authGuard;
  try {
    seedArborWritingLab();
    return NextResponse.json({ success: true, message: "Arbor Writing Lab seeded successfully" });
  } catch (error: any) {
    console.error("Seeding failed", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
