# ENSI SponsorAI & Cold Email Automation

A modern, high-performance B2B prospecting and cold email generation platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Google Gemini AI**.

Designed specifically for university engineering events (ENSI - École Nationale des Sciences de l'Informatique) to automate enterprise outreach, partnership proposals, and sponsorship acquisition.

---

## 🚀 Features

- **Google Sheets Live Extraction**: Connects directly to public Google Spreadsheets and extracts enterprise leads across multiple tabs.
- **3-Category Architecture**:
  - 🏢 **Entreprises & Startups**: Sponsorship packages (Platine, Gold, Silver), engineering talent recruitment (stages PFE), and booth placement.
  - 🎓 **Centres de Formation**: Training offers, student discount vouchers, and certified workshops.
  - 🥐 **Subvention Nature**: In-kind catering, refreshments, coffee breaks, and product placement.
- **Gemini AI Email Generator**: Tailors persuasive, high-converting cold outreach for each company with category-specific value propositions.
- **Interactive AI Chat Copilot**: Real-time chat assistant to adjust tone, add arguments, change language, or rephrase drafts directly in the workspace.
- **Review & Approval Workflow**:
  - Accept or refuse individual emails.
  - "Tout Accepter" (Accept All) for bulk approvals.
  - Direct in-place editing of subjects, recipients, and bodies.
- **Automated Scheduling Engine**:
  - Schedule individual emails or click "Tout Programmer" to stagger dispatches at 2-minute intervals.
  - Automated background ticker sends emails automatically when their scheduled time arrives.
  - Immediate send capabilities with delivery feedback.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **UI & State**: React 19, Lucide Icons, Tailwind CSS 4
- **Language**: TypeScript
- **AI**: Google Gemini REST API (`gemini-2.5-flash` / `gemini-1.5-flash`)
- **Data Source**: Google Sheets Visualization API (CSV export & parser)

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### 3. Build for Production
```bash
npm run build
npm run start
```
