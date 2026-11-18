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

const LOCAL_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'directives.json');
const TMP_FILE_PATH = path.join('/tmp', 'directives.json');

// In-memory fallback cache for serverless environments
let memoryCache: DirectivesData | null = null;

const DEFAULT_NOTES: DirectiveNote[] = [
  {
    id: 'dir-template',
    text: "Respecter scrupuleusement la structure du modèle officiel ORBYX ML Challenge 2.0 (introduction Jasser Ben Jomaa, 60 à 80 élèves-ingénieurs, les 5 piliers 'Ce que l'entreprise peut y gagner', formules de partenariat et proposition d'échange de 15 minutes, se terminant par 'Bien cordialement,')",
    enabled: true,
    createdAt: new Date().toISOString(),
  },
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

export function formatDirectivesText(notes: DirectiveNote[]): string {
  if (!Array.isArray(notes)) return '';
  return notes
    .filter((n) => n && n.enabled && n.text?.trim())
    .map((n) => `- ${n.text.trim()}`)
    .join('\n');
}

/**
 * Read directives from JSON file.
 * Handles read-only serverless filesystems (e.g. Vercel /var/task) by checking /tmp or bundled files.
 */
export function readDirectivesFromFile(): DirectivesData {
  // 1. Check in-memory cache
  if (memoryCache && Array.isArray(memoryCache.notes)) {
    return memoryCache;
  }

  // 2. Check /tmp on serverless environments
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ TMP_FILE_PATH)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ TMP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.notes)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch {}

  // 3. Check bundled local file
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ LOCAL_FILE_PATH)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ LOCAL_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.notes)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch {}

  // 4. Fallback to default notes
  const initialData: DirectivesData = {
    updatedAt: new Date().toISOString(),
    notes: DEFAULT_NOTES,
  };
  memoryCache = initialData;
  return initialData;
}

/**
 * Save directives array to JSON file.
 * Handles read-only serverless filesystems (EROFS) gracefully by falling back to /tmp and memory cache.
 */
export function saveDirectivesToFile(notes: DirectiveNote[]): DirectivesData {
  const data: DirectivesData = {
    updatedAt: new Date().toISOString(),
    notes,
  };

  memoryCache = data;

  // Try writing to local project path (works in local development)
  try {
    const dir = path.dirname(LOCAL_FILE_PATH);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ LOCAL_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    // Expected on Vercel / Lambda read-only filesystems (EROFS)
    // Silently fall back to /tmp
  }

  // Also write to /tmp (writable in serverless environments like Vercel and AWS Lambda)
  try {
    fs.writeFileSync(/*turbopackIgnore: true*/ TMP_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}

  return data;
}
