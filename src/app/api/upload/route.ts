import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { resolveAttachmentDiskPath } from '@/lib/email-attachments';

// In-memory file cache to survive serverless execution across instances
const memoryUploadedFiles = new Map<string, { buffer: Buffer; type: string; name: string }>();

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

    // Determine upload target directories:
    // Primary: local public/uploads (local dev)
    // Serverless fallback: os.tmpdir()/v5-uploads (writable on Vercel/Lambda)
    const localUploadDir = path.join(process.cwd(), 'public', 'uploads');
    const tmpUploadDir = path.join(os.tmpdir(), 'v5-uploads');

    // Ensure tmpUploadDir exists
    try {
      if (!fs.existsSync(tmpUploadDir)) {
        fs.mkdirSync(tmpUploadDir, { recursive: true });
      }
    } catch {}

    for (const file of files) {
      const originalName = file.name || 'document.pdf';
      const ext = path.extname(originalName);
      const baseName = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9à-öø-ÿÀ-ÖØ-ß\s\-_]/g, '')
        .trim();
      const safeName = `${baseName || 'piece_jointe'}${ext}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save into memory cache
      memoryUploadedFiles.set(safeName.toLowerCase(), {
        buffer,
        type: file.type || 'application/octet-stream',
        name: originalName,
      });

      let savedPath = '';

      // 1. Try local public/uploads (works in local dev, throws EROFS on Vercel)
      try {
        if (!fs.existsSync(localUploadDir)) {
          fs.mkdirSync(localUploadDir, { recursive: true });
        }
        let targetPath = path.join(localUploadDir, safeName);
        if (fs.existsSync(targetPath)) {
          const uniqueSuffix = Date.now().toString(36).slice(-4);
          targetPath = path.join(localUploadDir, `${baseName}_${uniqueSuffix}${ext}`);
        }
        fs.writeFileSync(targetPath, buffer);
        savedPath = targetPath;
      } catch {
        // EROFS on Vercel / serverless: Expected!
        // We gracefully fallback to tmpUploadDir
      }

      // 2. Always write to tmpUploadDir (writable in serverless environments)
      try {
        let tmpTargetPath = path.join(tmpUploadDir, safeName);
        if (fs.existsSync(tmpTargetPath)) {
          const uniqueSuffix = Date.now().toString(36).slice(-4);
          tmpTargetPath = path.join(tmpUploadDir, `${baseName}_${uniqueSuffix}${ext}`);
        }
        fs.writeFileSync(tmpTargetPath, buffer);
        if (!savedPath) {
          savedPath = tmpTargetPath;
        }
      } catch (err) {
        console.warn('Could not write to tmp upload dir:', err);
      }

      const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const fileNameForUrl = path.basename(savedPath || safeName);
      // URL points to /api/upload?file=... which works everywhere (local and Vercel)
      const fileUrl = `/api/upload?file=${encodeURIComponent(fileNameForUrl)}`;

      uploadedFiles.push({
        id,
        name: originalName,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: fileUrl,
        path: savedPath || fileNameForUrl,
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file') || searchParams.get('name');

    if (!fileName) {
      return NextResponse.json({ error: 'Nom de fichier manquant' }, { status: 400 });
    }

    // Try resolving from disk
    const diskPath = resolveAttachmentDiskPath({ name: fileName, filename: fileName });
    if (diskPath && fs.existsSync(diskPath)) {
      const buffer = fs.readFileSync(diskPath);
      const stat = fs.statSync(diskPath);
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': stat.size.toString(),
          'Content-Disposition': `inline; filename="${encodeURIComponent(path.basename(diskPath))}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Try in-memory cache
    const inMem = memoryUploadedFiles.get(fileName.toLowerCase());
    if (inMem) {
      return new NextResponse(new Uint8Array(inMem.buffer), {
        status: 200,
        headers: {
          'Content-Type': inMem.type,
          'Content-Length': inMem.buffer.length.toString(),
          'Content-Disposition': `inline; filename="${encodeURIComponent(inMem.name)}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur de lecture du fichier' }, { status: 500 });
  }
}
