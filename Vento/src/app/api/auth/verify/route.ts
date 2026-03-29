import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/verify-token";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { valid: false, error: "Missing or malformed Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);

    const realmAccess = payload.realm_access as
      | { roles?: string[] }
      | undefined;

    return NextResponse.json({
      valid: true,
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        preferred_username: payload.preferred_username,
      },
      roles: realmAccess?.roles ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: err instanceof Error ? err.message : "Token verification failed",
      },
      { status: 401 }
    );
  }
}
