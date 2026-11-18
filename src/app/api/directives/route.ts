import { NextRequest, NextResponse } from 'next/server';
import {
  DirectiveNote,
  formatDirectivesText,
  readDirectivesFromFile,
  saveDirectivesToFile,
} from '@/lib/directives';

export async function GET() {
  try {
    const data = readDirectivesFromFile();
    const combinedText = formatDirectivesText(data.notes);
    return NextResponse.json({
      success: true,
      updatedAt: data.updatedAt,
      notes: data.notes,
      combinedText,
    });
  } catch (error: any) {
    console.error('Error fetching directives:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read directives' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode 1: Direct save of entire array
    if (Array.isArray(body.notes)) {
      const sanitized: DirectiveNote[] = body.notes.map((n: any, idx: number) => ({
        id: n.id || `dir-${Date.now()}-${idx}`,
        text: String(n.text || '').trim(),
        enabled: typeof n.enabled === 'boolean' ? n.enabled : true,
        createdAt: n.createdAt || new Date().toISOString(),
      }));

      const saved = saveDirectivesToFile(sanitized);
      const combinedText = formatDirectivesText(saved.notes);
      return NextResponse.json({
        success: true,
        message: 'Directives enregistrées dans le fichier JSON',
        updatedAt: saved.updatedAt,
        notes: saved.notes,
        combinedText,
      });
    }

    // Mode 2: Action-based operations (add, modify, delete, toggle)
    const { action, id, text, enabled } = body;
    const current = readDirectivesFromFile();
    let updatedNotes = [...current.notes];

    switch (action) {
      case 'add': {
        if (!text || !text.trim()) {
          return NextResponse.json({ error: 'Le texte de la consigne est requis' }, { status: 400 });
        }
        const newNote: DirectiveNote = {
          id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: text.trim(),
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        updatedNotes.push(newNote);
        break;
      }

      case 'modify':
      case 'update': {
        if (!id) {
          return NextResponse.json({ error: "L'identifiant de la consigne est requis" }, { status: 400 });
        }
        updatedNotes = updatedNotes.map((n) =>
          n.id === id
            ? {
                ...n,
                text: typeof text === 'string' ? text.trim() : n.text,
                enabled: typeof enabled === 'boolean' ? enabled : n.enabled,
              }
            : n
        );
        break;
      }

      case 'delete': {
        if (!id) {
          return NextResponse.json({ error: "L'identifiant de la consigne est requis" }, { status: 400 });
        }
        updatedNotes = updatedNotes.filter((n) => n.id !== id);
        break;
      }

      case 'toggle': {
        if (!id) {
          return NextResponse.json({ error: "L'identifiant de la consigne est requis" }, { status: 400 });
        }
        updatedNotes = updatedNotes.map((n) =>
          n.id === id ? { ...n, enabled: !n.enabled } : n
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Action invalide ou tableau de notes manquant' },
          { status: 400 }
        );
    }

    const saved = saveDirectivesToFile(updatedNotes);
    const combinedText = formatDirectivesText(saved.notes);

    return NextResponse.json({
      success: true,
      message: 'Fichier JSON mis à jour avec succès',
      updatedAt: saved.updatedAt,
      notes: saved.notes,
      combinedText,
    });
  } catch (error: any) {
    console.error('Error updating directives JSON:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update directives' },
      { status: 500 }
    );
  }
}
