import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ msg: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ msg: 'Only image files are allowed' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `qr-${Date.now()}.${ext}`;
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ msg: 'Upload failed' }, { status: 500 });
  }
}
