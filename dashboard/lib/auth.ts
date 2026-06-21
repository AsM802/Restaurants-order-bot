import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function getUserIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return decoded.restaurant?.id || null;
  } catch (err) {
    return null;
  }
}
