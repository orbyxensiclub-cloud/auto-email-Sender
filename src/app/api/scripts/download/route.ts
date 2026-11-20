import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file') || 'check_campaign.py';

  const safeFilename = file === 'requirements.txt' ? 'requirements.txt' : file === 'README.md' ? 'README.md' : 'check_campaign.py';
  const filePath = path.join(process.cwd(), 'scripts', safeFilename);

  if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
  }

  const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');

  return new NextResponse(fileContent, {
    status: 200,
    headers: {
      'Content-Type': file.endsWith('.py') ? 'text/x-python' : 'text/plain',
      'Content-Disposition': `attachment; filename="${file}"`,
    },
  });
}
