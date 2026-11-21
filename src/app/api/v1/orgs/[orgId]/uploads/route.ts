import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/auth-helpers";
import { uploadR2Object } from "@/lib/r2";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// POST /api/v1/orgs/:orgId/uploads (Server-side R2 upload fallback)
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fiscalYear =
      parseInt(formData.get("fiscalYear") as string, 10) ||
      new Date().getFullYear();
    const fiscalMonth =
      parseInt(formData.get("fiscalMonth") as string, 10) ||
      new Date().getMonth() + 1;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const fileUuid = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/webp";

    const result = await uploadR2Object({
      orgId,
      fiscalYear,
      fiscalMonth,
      fileUuid,
      mimeType,
      buffer,
    });

    return NextResponse.json({
      success: true,
      data: {
        key: result.key,
        publicUrl: result.publicUrl,
      },
    });
  } catch (err) {
    console.error("Server upload to R2 error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload image to storage" },
      { status: 500 }
    );
  }
}
