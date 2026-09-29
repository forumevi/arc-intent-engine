import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  const res = await fetch(`${BACKEND_URL}/api/v1/intent/${id}/${action}`, { method: 'POST' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
