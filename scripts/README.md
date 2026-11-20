# Audit & Suivi des Retours Gmail — Campagne Sponsoring ENSI

Ce script Python se connecte à votre compte Gmail via l'API officielle Google Gmail (**lecture seule : `gmail.readonly`**) et analyse automatiquement tous les retours de votre campagne d'e-mails pour classer chaque destinataire de `recipients.csv` :
- **BOUNCED (Rebond)** : Distingue les erreurs `PERMANENT` (5.x.x, utilisateur inexistant, boîte désactivée, NXDOMAIN) des erreurs `TEMPORARY` (4.x.x, boîte pleine, indisponibilité temporaire).
- **REPLIED (Réponse directe)** : Détecte les vraies réponses humaines avec date et objet de la réponse.
- **REPLIED_OTHER_SENDER (Réponse d'un collaborateur)** : Détecte si un collègue du même domaine d'entreprise (ex: RH ou collègue de direction) a répondu à la place du contact ciblé.
- **AUTO-REPLY (Réponse automatique)** : Détecte les messages d'absence du bureau / congés sans les confondre avec une vraie réponse.
- **NO RESPONSE** : Destinataires n'ayant pas encore répondu.

---

## 1. Installation Rapide

```bash
cd scripts
pip install -r requirements.txt
```

---

## 2. Configuration Google Cloud (OAuth 2.0 Desktop)

### Étape 1 : Créer le projet Google Cloud
1. Rendez-vous sur la [Console Google Cloud](https://console.cloud.google.com/).
2. Cliquez sur le sélecteur de projet en haut, puis **Nouveau projet**.
3. Nommez-le par exemple `ENSI-Campaign-Auditor` et cliquez sur **Créer**.

### Étape 2 : Activer l'API Gmail
1. Dans le menu de gauche, allez dans **API et services > Bibliothèque**.
2. Recherchez **Gmail API** et cliquez sur **Activer**.

### Étape 3 : Configurer l'Écran de consentement OAuth
1. Allez dans **API et services > Écran de consentement OAuth**.
2. Choisissez le type d'utilisateur **Externe** (ou Interne si vous êtes sur Google Workspace ENSI) et cliquez sur **Créer**.
3. Remplissez le nom de l'application (ex: `Email Campaign Checker`) et vos adresses e-mail d'assistance et de développeur.
4. À l'étape **Champs d'application (Scopes)** :
   - Cliquez sur **Ajouter ou supprimer des champs d'application**.
   - Recherchez et cochez uniquement : `https://www.googleapis.com/auth/gmail.readonly`.
5. À l'étape **Utilisateurs test (Test users)** — **ESSENTIEL** :
   - Cliquez sur **+ Add users**.
   - Ajoutez votre adresse Gmail expéditrice (ex: `orbyx.ensiclub@ensi-uma.tn` ou votre Gmail personnel utilisé pour l'envoi).
   - Cliquez sur **Enregistrer et continuer**.

### Étape 4 : Télécharger `credentials.json`
1. Allez dans **API et services > Identifiants**.
2. Cliquez sur **+ Créer des identifiants > ID client OAuth**.
3. Sélectionnez le type d'application : **Application pour ordinateur (Desktop App)**.
4. Nommez-le (ex: `Desktop Checker`) et cliquez sur **Créer**.
5. Cliquez sur l'icône de téléchargement **Télécharger le fichier JSON**.
6. Renommez ce fichier téléchargé en `credentials.json` et déposez-le dans le dossier `scripts/` (ou à la racine de votre projet).

---

## 3. Lancement du Script

Assurez-vous d'avoir votre fichier `recipients.csv` (contenant au moins la colonne `email`). Vous pouvez l'exporter en 1 clic depuis l'onglet **Suivi & Audit Emails** de l'application web.

```bash
# Analyse par défaut (14 derniers jours)
python check_campaign.py --recipients recipients.csv

# Analyse sur une période spécifique (ex: 30 jours)
python check_campaign.py --recipients recipients.csv --days 30

# Mode verbeux avec logs détaillés
python check_campaign.py --recipients recipients.csv --verbose
```

> **Premier lancement** : Une fenêtre de navigateur s'ouvrira automatiquement pour vous authentifier avec votre compte Google. Cliquez sur votre compte, acceptez l'accès en lecture seule. Un fichier `token.json` sera généré et rechargera automatiquement vos sessions suivantes sans redemander de connexion.

---

## 4. Fichiers de Résultats Générés

| Fichier | Contenu | Utilisation recommandée |
| :--- | :--- | :--- |
| `results.csv` | Liste complète de tous les contacts avec colonnes statut, type de rebond, raison exacte, date et objet de réponse. | Rapport global de campagne & analyse CRM |
| `to_clean.csv` | Rebonds permanents (erreurs 5.x.x, NXDOMAIN, adresses inexistantes). | **À nettoyer immédiatement** de votre base de données pour protéger la réputation de votre nom de domaine. |
| `to_retry.csv` | Rebonds temporaires (boîte pleine 4.x.x) et contacts sans réponse. | File prioritaire pour les relances ou les renvois ultérieurs. |
| `replied.csv` | Contacts ayant répondu positivement (réponses directes et collègues du même domaine). | Prospects chauds à traiter pour closing sponsoring. |

---

## 5. Note Importante sur l'Expiration du Token (Mode Testing Google)

Tant que votre application Google Cloud est en statut **"Testing"** (état par défaut lors de la création du projet) :
- Les tokens d'actualisation (`refresh_token`) Google expirent au bout de **7 jours**.
- Si vous réexécutez le script après 7 jours, il vous demandera simplement de ré-autoriser l'accès via le navigateur en 1 clic.
- Si vous souhaitez un token permanent (sans expiration de 7 jours), il suffit de cliquer sur **Publier l'application** dans l'écran de consentement OAuth de Google Cloud Console.

---

## 6. Recommandations pour vos Prochaines Campagnes

Pour rendre le suivi encore plus automatique et 100% déterministe lors de vos prochains envois :

1. **Enregistrer l'ID de Message (`Message-ID`) et de Fil (`threadId`)** :
   À chaque envoi via l'API Gmail ou SMTP, stockez le `Message-ID` dans votre base de données (`src/data/leads.json`). Vous pourrez ainsi interroger directement le fil de discussion sans passer par une recherche textuelle.
2. **Ajouter un En-tête Personnalisé (`X-Campaign-ID`)** :
   Ajoutez un en-tête d'identification dans vos e-mails :
   ```json
   {
     "X-Campaign-ID": "orbyx-ml-challenge-2.0",
     "X-Lead-ID": "lead-12345"
   }
   ```
   Les serveurs mail retournent souvent ces en-têtes dans les messages d'erreur de distribution (`Delivery Status Notification`), ce qui permet d'identifier immédiatement le lead correspondant à 100%.
3. **Paramétrer une adresse de retour dédiée (`Return-Path`)** :
   Utiliser une adresse distincte (ex: `bounces@orbyx-ensi.tn`) permet d'isoler automatiquement tous les rapports d'échec de distribution.
