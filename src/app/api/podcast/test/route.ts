import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[PodcastTest] Test endpoint called');
  return NextResponse.json({ status: 'ok', message: 'Podcast test endpoint working' });
} 