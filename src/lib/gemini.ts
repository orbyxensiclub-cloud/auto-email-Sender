import { CompanyLead } from './sheets';

export interface EventDetails {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  organization: string;
  attendees: string;
  organizerName: string;
  organizerRole: string;
  organizerPhone: string;
  organizerEmail: string;
  customNotes?: string;
}

export const defaultEventDetails: EventDetails = {
  eventName: 'ML Challenge 2.0',
  eventDate: 'Décembre 2026',
  eventLocation: "École Nationale des Sciences de l'Informatique (ENSI), Manouba, Tunis",
  organization: "ORBYX — Club IA de l'ENSI",
  attendees: "60 à 80 élèves-ingénieurs participants au challenge (200+ membres actifs ORBYX, >1000 étudiants visés pour 2026/2027)",
  organizerName: 'Jasser Ben Jomaa',
  organizerRole: "Responsable Sponsoring — ORBYX, Club IA de l'ENSI",
  organizerPhone: '58745567',
  organizerEmail: 'orbyx.ensiclub@ensi-uma.tn',
  customNotes: 'Formules annuelles Bronze, Argent, Or et Platine. Possibilités : soutien financier, lots pour les gagnants, crédits cloud, datasets, mentorat, stages ou soutien logistique.',
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Call Gemini API directly via REST using gemini-3.5-flash-lite.
 */
export async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  asJson = true,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<any> {
  const models = [
    modelName || 'gemini-3.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (asJson) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Gemini API returned status ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('No response text received from Gemini');
      }

      if (asJson) {
        const cleaned = rawText.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(cleaned);
      }

      return rawText;
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini API');
}

/**
 * Build tailored system instructions and prompt for initial email generation based on Category and ORBYX ML Challenge 2.0 template.
 */
export function buildEmailPrompt(
  lead: CompanyLead,
  event: EventDetails,
  globalDirectives?: string
): { systemInstruction: string; prompt: string } {
  const isSponsorship = lead.category === 'ensi';
  const isFormation = lead.category === 'formation';
  const isFood = lead.category === 'food';

  const systemInstruction = `Tu es un expert d'élite en communication B2B et relations partenariats pour ORBYX, le club d'Intelligence Artificielle de l'ENSI (École Nationale des Sciences de l'Informatique de Tunis).
Ton objectif est de rédiger un e-mail de prospection de sponsoring personnalisé pour le ML Challenge 2.0, en Français impeccable, chaleureux, percutant et professionnel.

MODÈLE DE RÉFÉRENCE OFFICIEL À SUIVRE :
"""
Bonjour [Prénom],

En décembre, 60 à 80 élèves-ingénieurs de l'ENSI relèveront un défi concret de machine learning à l'occasion du ML Challenge 2.0. Nous souhaitons associer à cette initiative des entreprises engagées dans l'IA et la formation des futurs talents.

Je suis Jasser Ben Jomaa, Responsable Sponsoring d'ORBYX, le club IA de l'ENSI, école d'ingénieurs spécialisée en informatique en Tunisie.

Lors de sa première saison, ORBYX a réuni plus de 200 membres actifs, organisé plus de 13 ateliers et 3 compétitions Kaggle, et accompagné 4 projets d'IA. Pour 2026/2027, nous visons plus de 1 000 étudiants touchés, avec un hackathon en avril et un Demo Day en mai.

Ce que [Nom de l'entreprise] peut y gagner :

Visibilité : votre logo sur nos supports de communication et des publications dédiées sur LinkedIn et Instagram.

Recrutement : des rencontres directes avec les participants et, avec leur accord, un accès à des CV de candidats intéressés par des stages et de premières opportunités professionnelles.

Marque employeur : l'occasion de présenter votre culture d'entreprise, vos métiers et vos technologies à de futurs ingénieurs.

Expertise : la possibilité de proposer un cas d'usage ou un dataset, de mentorer les équipes ou de rejoindre le jury.

Impact : une contribution concrète au développement des compétences en IA en Tunisie.

Comment devenir partenaire ?

Votre contribution peut prendre plusieurs formes : soutien financier, lots pour les gagnants, crédits cloud, datasets, mentorat, stages ou soutien logistique. Nos formules annuelles Bronze, Argent, Or et Platine sont détaillées dans le dossier de partenariat ci-joint.

Seriez-vous disponible pour un échange de 15 minutes dans les prochains jours ? Je serais ravi de vous présenter le challenge et d'explorer avec vous les formes de partenariat les plus pertinentes pour votre entreprise.

Merci pour votre temps et votre considération. Au plaisir d'échanger avec vous !

Bien cordialement,
"""

DIRECTIVES DE PERSONNALISATION GEMINI (LITTLE CUSTOMIZATION) :
1. Salutation : Si un prénom/nom de contact est connu (lead.contactPerson), utilise "Bonjour [Prénom]," ou "Bonjour [Titre/Nom],". Si aucun contact n'est spécifié, utilise "Bonjour," ou "Madame, Monsieur,".
2. Remplace [Nom de l'entreprise] par le nom réel de l'entreprise (${lead.name}).
3. Personnalisation subtile : Adapte délicatement 1 ou 2 points (par exemple dans 'Ce que [Entreprise] peut y gagner' ou 'Comment devenir partenaire') pour refléter les activités, la technologie ou le secteur de l'entreprise ciblée (par exemple IA, Big Data, Cloud, EdTech, restauration/logistique, recrutement ingénieurs PFE).
4. Fin de l'e-mail : Termine OBLIGATOIREMENT après "Bien cordialement,". NE METS AUCUN NOM, TITRE, TÉLÉPHONE OU LIEN après "Bien cordialement,", car le bloc graphique officiel ORBYX (avec logo, Jasser Ben Jomaa, Responsable Sponsoring, 58745567 et réseaux sociaux) est automatiquement et systématiquement attaché en dessous.
5. Format de sortie attendu : Objet JSON avec exactement deux clés :
- "subject": Objet percutant et professionnel (ex: "ML Challenge 2.0 (ORBYX — ENSI) x ${lead.name} : Partenariat IA & Talents d'élite").
- "body": Corps complet de l'e-mail se terminant exactement par "Bien cordialement,".`;

  let categorySpecificGoal = '';
  if (isSponsorship) {
    categorySpecificGoal = `
CATÉGORIE : ENTREPRISE / TECH / STARTUP
- Valorise : visibilité marque employeur, recrutement des meilleurs élèves-ingénieurs en IA/ML de l'ENSI, mentorat, accès aux CV et packs de partenariat (Bronze, Argent, Or, Platine).`;
  } else if (isFormation) {
    categorySpecificGoal = `
CATÉGORIE : CENTRE DE FORMATION & CERTIFICATIONS
- Adapte : valorise les opportunités de proposer des bons de réduction / vouchers de certification pour les gagnants du challenge, animations de workshops IA et visibilité auprès des futurs diplômés.`;
  } else if (isFood) {
    categorySpecificGoal = `
CATÉGORIE : SUBVENTION EN NATURE / RESTAURATION
- Adapte : valorise le sponsoring en nature (pauses-café, rafraîchissements, déjeuners des participants lors du ML Challenge), présence visuelle et dégustation.`;
  }

  const directivesSection = globalDirectives?.trim()
    ? `\nCONSIGNES PARTICULIÈRES UTILISATEUR :\n"${globalDirectives.trim()}"\n`
    : '';

  const prompt = `Rédige l'e-mail pour l'entreprise suivante en appliquant le modèle ORBYX ML Challenge 2.0 avec une personnalisation subtile adaptée :
- Entreprise ciblée : ${lead.name}
- Destinataire : ${lead.contactPerson || 'Responsable Partenariats / Direction'}
- Ville / Adresse : ${lead.address || 'Non spécifiée'}
- Notes sur l'entreprise : ${lead.notes || 'Aucune'}

Informations Événement :
- Nom : ${event.eventName} (${event.eventDate})
- Organisateur : ${event.organization}
- Signataire : ${event.organizerName}, ${event.organizerRole}
- Contact : ${event.organizerEmail} | ${event.organizerPhone}
${categorySpecificGoal}
${directivesSection}

Retourne impérativement un JSON valide :
{
  "subject": "ML Challenge 2.0 (ORBYX — ENSI) x ${lead.name} : ...",
  "body": "Bonjour ...\\n\\n..."
}`;

  return { systemInstruction, prompt };
}

/**
 * Build chat refinement prompt to modify existing email.
 */
export function buildChatRefinementPrompt(
  lead: CompanyLead,
  event: EventDetails,
  currentSubject: string,
  currentBody: string,
  userMessage: string,
  history: Array<{ sender: 'user' | 'assistant'; text: string }>,
  globalDirectives?: string
): { systemInstruction: string; prompt: string } {
  const systemInstruction = `Tu es l'assistant IA de rédaction d'e-mails pour ORBYX, le club IA de l'ENSI.
L'utilisateur te demande d'ajuster l'e-mail de sponsoring pour "${lead.name}" dans le cadre du ML Challenge 2.0.
Réponds de manière concise et retourne l'e-mail complet révisé.

Format de sortie JSON obligatoire :
{
  "reply": "Explication brève des modifications apportées.",
  "subject": "Nouvel objet (ou existant si inchangé)",
  "body": "Nouveau corps d'email complet avec les modifications demandées"
}`;

  const historyContext = history.slice(-6).map((h) => `${h.sender === 'user' ? 'Utilisateur' : 'Assistant'}: ${h.text}`).join('\n');
  const directivesSection = globalDirectives?.trim()
    ? `\nCONSIGNES DU PROJET :\n"${globalDirectives.trim()}"\n`
    : '';

  const prompt = `Entreprise : ${lead.name} (${lead.category})
Événement : ${event.eventName} (${event.eventDate})

E-mail Actuel :
OBJET : ${currentSubject}
CORPS :
${currentBody}

Historique récent du chat :
${historyContext}
${directivesSection}
Demande de l'utilisateur :
"${userMessage}"

Applique ces modifications et retourne l'objet JSON avec "reply", "subject", et "body".`;

  return { systemInstruction, prompt };
}
