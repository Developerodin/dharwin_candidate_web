import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const label = (formData.get('label') as string) || '';

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const documentsDir = path.join(process.cwd(), 'public', 'assets', 'documents');
    await mkdir(documentsDir, { recursive: true });

    // Preserve original filename and extension; only sanitize base and prefix timestamp
    const originalName = file.name || 'upload';
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timePrefix = Date.now();
    const fileName = `${timePrefix}_${safeBase}${ext}`;
    const filePath = path.join(documentsDir, fileName);
    await writeFile(filePath, buffer);

    const origin = new URL(request.url).origin;
    const publicPath = `assets/documents/${fileName}`;
    const absolutePath = `${origin}/${publicPath}`;
    return NextResponse.json({ path: absolutePath }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Upload failed' }, { status: 500 });
  }
}


