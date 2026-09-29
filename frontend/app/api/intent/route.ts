import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const paymentProof = req.headers.get('x-payment-proof') || '';

  const res = await fetch(`${BACKEND_URL}/api/v1/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(paymentProof ? { 'x-payment-proof': paymentProof } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
