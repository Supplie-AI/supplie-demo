import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json();
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword || password !== demoPassword) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
