import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const demoPassword = process.env.DEMO_PASSWORD;

  console.log("[auth/check] Received password length:", password?.length);
  console.log("[auth/check] Expected password exists:", !!demoPassword);
  console.log("[auth/check] Expected password length:", demoPassword?.length);
  console.log("[auth/check] Match:", password === demoPassword);

  if (!demoPassword || password !== demoPassword) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
