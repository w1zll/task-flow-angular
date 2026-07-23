import { getBoardContentTag } from '@/shared/cache/board-cache-tags';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.FRONTEND_REVALIDATE_SECRET;
  const requestSecret = request.headers.get('x-revalidate-secret');

  if (!secret || requestSecret !== secret) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    boardId?: unknown;
  } | null;
  const boardId = typeof body?.boardId === 'string' ? body.boardId : null;

  if (!boardId) {
    return NextResponse.json({ message: 'boardId is required' }, { status: 400 });
  }

  revalidateTag(getBoardContentTag(boardId), { expire: 0 });

  return NextResponse.json({ revalidated: true, tag: getBoardContentTag(boardId) });
}
