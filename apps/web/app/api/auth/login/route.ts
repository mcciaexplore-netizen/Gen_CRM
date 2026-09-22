import { NextRequest, NextResponse } from "next/server";

const DEMO_EMAIL = "demo@mccia.in";
const DEMO_PASSWORD = "mccia@2024";

const DEMO_RESPONSE = {
  accessToken: "demo-access-token",
  user: {
    id: "demo-user-id",
    email: DEMO_EMAIL,
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (
    body.email === DEMO_EMAIL &&
    body.password === DEMO_PASSWORD
  ) {
    const response = NextResponse.json(DEMO_RESPONSE, { status: 200 });
    response.cookies.set("accessToken", "demo-access-token", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("refreshToken", "demo-refresh-token", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  return NextResponse.json(
    { message: "Invalid email or password. Use demo@mccia.in / mccia@2024" },
    { status: 401 }
  );
}
