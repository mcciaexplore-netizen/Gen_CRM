import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Accept any signup for demo purposes
  const DEMO_RESPONSE = {
    accessToken: "demo-access-token",
    user: {
      id: "demo-user-id",
      email: body.email ?? "demo@mccia.in",
      name: body.name ?? "MCCIA Member",
      role: "OWNER",
      businessId: "demo-business-id",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    business: {
      id: "demo-business-id",
      name: body.businessName ?? "My Business",
      slug: "demo-business",
      onboardingCompletedAt: null, // will trigger setup flow
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const response = NextResponse.json(DEMO_RESPONSE, { status: 201 });
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
