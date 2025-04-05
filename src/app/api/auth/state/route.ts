import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const authState = cookieStore.get('auth_state');

  if (!authState) {
    return NextResponse.json({ state: null });
  }

  try {
    const state = JSON.parse(authState.value);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json({ state: null });
  }
} 