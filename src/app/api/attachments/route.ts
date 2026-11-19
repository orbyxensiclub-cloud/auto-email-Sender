import { NextRequest, NextResponse } from 'next/server';
import { getGlobalAttachments, saveGlobalAttachments, StoredAttachment } from '@/lib/email-attachments';

export async function GET() {
  try {
    const attachments = getGlobalAttachments();
    return NextResponse.json({
      success: true,
      attachments,
    });
  } catch (error: any) {
    console.error('Error fetching global attachments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch global attachments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.attachments)) {
      return NextResponse.json(
        { error: 'Paramètre "attachments" requis (tableau de pièces jointes)' },
        { status: 400 }
      );
    }

    const attachments: StoredAttachment[] = body.attachments;
    saveGlobalAttachments(attachments);

    return NextResponse.json({
      success: true,
      attachments,
      message: `${attachments.length} pièce(s) jointe(s) globale(s) enregistrée(s).`,
    });
  } catch (error: any) {
    console.error('Error saving global attachments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save global attachments' },
      { status: 500 }
    );
  }
}
