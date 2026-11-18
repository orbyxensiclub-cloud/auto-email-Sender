import fs from 'fs';
import path from 'path';

export interface DirectiveNote {
  id: string;
  text: string;
  enabled: boolean;
  createdAt: string;
}

export interface DirectivesData {
  updatedAt: string;
  notes: DirectiveNote[];
}

const DIRECTIVES_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'directives.json');

const DEFAULT_NOTES: DirectiveNote[] = [
  {
    id: 'dir-1',
    text: "Toujours vouvoyer et adopter une politesse d'élite",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-2',
    text: 'Insister fortement sur le recrutement des stagiaires PFE en informatique & IA',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-3',
    text: "Garder l'e-mail percutant et en dessous de 150 mots",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-4',
    text: 'Proposer un court échange visio ou téléphonique de 15 minutes',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-5',
    text: 'Ne pas dévoiler les prix des packs de sponsoring dès le premier e-mail',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-6',
    text: "Mentionner les 800+ élèves-ingénieurs et chercheurs de l'ENSI",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dir-7',
    text: "Valoriser le logo de l'entreprise sur tous les supports média",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

export function getDirectivesFilePath(): string {
  return DIRECTIVES_FILE_PATH;
}

/**
 * Format active notes into a bulleted string for LLM system prompt / globalDirectives
 */
export function formatDirectivesText(notes: DirectiveNote[]): string {
  if (!Array.isArray(notes)) return '';
  return notes
    .filter((n) => n && n.enabled && n.text?.trim())
    .map((n) => `- ${n.text.trim()}`)
    .join('\n');
}

/**
 * Read directives from JSON file. Returns default notes if file does not exist.
 */
export function readDirectivesFromFile(): DirectivesData {
  try {
    if (!fs.existsSync(DIRECTIVES_FILE_PATH)) {
      const initialData: DirectivesData = {
        updatedAt: new Date().toISOString(),
        notes: DEFAULT_NOTES,
      };
      saveDirectivesToFile(initialData.notes);
      return initialData;
    }

    const content = fs.readFileSync(DIRECTIVES_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.notes)) {
      return {
        updatedAt: new Date().toISOString(),
        notes: DEFAULT_NOTES,
      };
    }
    return parsed;
  } catch (error) {
    console.error('Error reading directives JSON file:', error);
    return {
      updatedAt: new Date().toISOString(),
      notes: DEFAULT_NOTES,
    };
  }
}

/**
 * Save directives array to JSON file.
 */
export function saveDirectivesToFile(notes: DirectiveNote[]): DirectivesData {
  const dir = path.dirname(DIRECTIVES_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data: DirectivesData = {
    updatedAt: new Date().toISOString(),
    notes,
  };

  fs.writeFileSync(DIRECTIVES_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
