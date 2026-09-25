import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "zero-prompt-learning-api",
    docs: "/api/health",
  });
}
