import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileProvider = searchParams.get('provider');
  const fileId = searchParams.get('fileId');
  const containerId = searchParams.get('containerId');

  if (!fileId || !fileProvider) {
    return NextResponse.json({ error: 'Missing provider or fileId' }, { status: 400 });
  }

  if (fileProvider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!containerId) {
      return NextResponse.json({ error: 'containerId required for OpenAI files' }, { status: 400 });
    }
    try {
      // Containers API: /v1/containers/{containerId}/files/{fileId}/content
      const res = await fetch(
        `https://api.openai.com/v1/containers/${containerId}/files/${fileId}/content`,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );
      if (!res.ok) {
        return NextResponse.json({ error: `OpenAI returned ${res.status}` }, { status: res.status });
      }
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileId}"`,
        },
      });
    } catch (err) {
      console.error('files/download openai error', err);
      return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
  }

  if (fileProvider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic not configured' }, { status: 503 });
    }
    const client = new Anthropic({ apiKey });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = await (client.beta.files as any).content(fileId);
      const buffer = await content.arrayBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileId}"`,
        },
      });
    } catch (err) {
      console.error('files/download anthropic error', err);
      return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
}
