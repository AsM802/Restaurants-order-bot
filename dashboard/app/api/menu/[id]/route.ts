import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const item = await MenuItem.findOne({ _id: id, restaurantId: userId });
    if (!item) {
      return NextResponse.json({ msg: 'Item not found' }, { status: 404 });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(id, { $set: body }, { new: true });
    return NextResponse.json(updatedItem);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const item = await MenuItem.findOne({ _id: id, restaurantId: userId });
    if (!item) {
      return NextResponse.json({ msg: 'Item not found' }, { status: 404 });
    }

    await MenuItem.findByIdAndDelete(id);
    return NextResponse.json({ msg: 'Item removed' });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
