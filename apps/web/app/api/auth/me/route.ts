import { NextRequest, NextResponse } from "next/server";

const DEMO_SESSION = {
  user: {
    id: "demo-user-id",
    email: "demo@mccia.in",
    name: "MCCIA Demo User",
    role: "OWNER",
    businessId: "demo-business-id",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  business: {
    id: "demo-business-id",
    name: "MCCIA Demo Business",
    slug: "mccia-demo",
    onboardingCompletedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export async function GET(request: NextRequest) {
  // Check for demo session cookie
  const accessToken = request.cookies.get("accessToken")?.value;
  if (accessToken === "demo-access-token") {
    return NextResponse.json(DEMO_SESSION, { status: 200 });
  }
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
