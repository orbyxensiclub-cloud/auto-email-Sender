import { NextRequest, NextResponse } from 'next/server';
import {
  getGlobalAttachments,
  saveGlobalAttachments,
  getDefaultGlobalAttachment,
  StoredAttachment,
} from '@/lib/email-attachments';

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
    let attachments: StoredAttachment[] | null = null;

    if (Array.isArray(body)) {
      attachments = body;
    } else if (Array.isArray(body.attachments)) {
      attachments = body.attachments;
    }

    if (!attachments) {
      return NextResponse.json(
        { error: 'Paramètre "attachments" requis (tableau de pièces jointes)' },
        { status: 400 }
      );
    }

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

export async function DELETE() {
  try {
    const defaultAtt = getDefaultGlobalAttachment();
    saveGlobalAttachments([defaultAtt]);

    return NextResponse.json({
      success: true,
      attachments: [defaultAtt],
      message: 'Pièce jointe par défaut rétablie avec succès.',
    });
  } catch (error: any) {
    console.error('Error resetting global attachments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset global attachments' },
      { status: 500 }
    );
  }
}
