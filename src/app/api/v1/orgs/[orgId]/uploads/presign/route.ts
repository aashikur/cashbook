import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/auth-helpers";
import { createPresignedUploadUrl } from "@/lib/r2";
import { z } from "zod";

const presignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(["image/webp", "image/jpeg", "image/png", "application/pdf"]).default("image/webp"),
  sizeBytes: z.number().int().positive().max(15 * 1024 * 1024, "Max file size is 15MB"),
  fiscalYear: z.number().int().min(2000).max(2100),
  fiscalMonth: z.number().int().min(1).max(12),
});

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// POST /api/v1/orgs/:orgId/uploads/presign (Admin only)
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = presignSchema.parse(body);

    const fileUuid = crypto.randomUUID();

    const result = await createPresignedUploadUrl({
      orgId,
      fiscalYear: validated.fiscalYear,
      fiscalMonth: validated.fiscalMonth,
      fileUuid,
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Presign upload error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate presigned upload URL" },
      { status: 500 }
    );
  }
}
