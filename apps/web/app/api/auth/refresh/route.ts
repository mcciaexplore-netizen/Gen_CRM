import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Token refreshed" },
    { status: 200 }
  );
  response.cookies.set("accessToken", "demo-access-token", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
