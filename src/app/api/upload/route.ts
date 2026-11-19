import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadedFiles: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      url: string;
      path: string;
    }> = [];

    // Support both multiple files 'files' and single 'file'
    const files: File[] = [];
    const filesField = formData.getAll('files');
    const singleField = formData.getAll('file');

    for (const item of [...filesField, ...singleField]) {
      if (item instanceof File && item.size > 0) {
        files.push(item);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(/*turbopackIgnore: true*/ uploadDir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ uploadDir, { recursive: true });
    }

    for (const file of files) {
      // Clean filename
      const originalName = file.name || 'document.pdf';
      const ext = path.extname(originalName);
      const baseName = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9à-öø-ÿÀ-ÖØ-ß\s\-_]/g, '')
        .trim();
      const safeName = `${baseName || 'piece_jointe'}${ext}`;

      // Avoid overwriting by appending timestamp if exists
      let finalName = safeName;
      let targetPath = path.join(uploadDir, finalName);
      if (fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
        const uniqueSuffix = Date.now().toString(36).slice(-4);
        finalName = `${baseName}_${uniqueSuffix}${ext}`;
        targetPath = path.join(uploadDir, finalName);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(/*turbopackIgnore: true*/ targetPath, buffer);

      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const fileUrl = `/uploads/${encodeURIComponent(finalName)}`;

      uploadedFiles.push({
        id,
        name: originalName,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: fileUrl,
        path: targetPath,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} fichier(s) téléversé(s) avec succès.`,
    });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Échec du téléversement de fichier' },
      { status: 500 }
    );
  }
}
