# A² Compass 🧭

**Achievement Academy's Adaptive Learning Platform**

An adaptive, tier-based learning platform designed for personalized education across grade levels 1-12.

## 🏛️ Three-Tier System

| Tier | Grades | Focus |
|------|--------|-------|
| **Explorers' Camp** 🌿 | 1-6 | Discovery-based learning with guided exploration |
| **Scholars' Guild** 📘 | 7-9 | Critical thinking and collaborative learning |
| **The Collegium** 🎓 | 10-12 | Independent research and college preparation |

## 📚 Six Subject Domains
Math • Reading/ELA • Science • Social Studies • Foreign Language • Creative Arts

## 🎯 Key Features
- **Flight Plan** — Daily student workflow hub
- **Mastery System** — 85% threshold to advance
- **4 Enrollment Models** — Full-Time, Tutoring, Summer Program, A La Carte
- **7 Learning Formats** — Live Seminar, Discussion Board, Choice Board, Independent Project, Partner Quest, One-on-One Coaching, Practice Arena
- **Role-Based Access** — Admin, Teacher, Parent, Student dashboards

## 🛠️ Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **State**: Redux Toolkit
- **Backend**: Supabase (Auth, Database, Storage, RLS)
- **Payments**: Stripe (upcoming)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in your Supabase credentials

# Start dev server
npm run dev
```

## 📁 Project Structure
```
src/
├── components/       # Reusable UI components
│   ├── common/       # Buttons, inputs, modals, etc.
│   ├── layout/       # Navigation, sidebar, headers
│   └── features/     # Feature-specific components
├── pages/            # Route pages by role
│   ├── auth/         # Login, register, password reset
│   ├── admin/        # Admin dashboard & management
│   ├── teacher/      # Teacher tools & class management
│   ├── parent/       # Parent portal & progress views
│   └── student/      # Student Flight Plan & activities
├── services/         # API & Supabase service layer
├── store/            # Redux store & slices
├── types/            # TypeScript type definitions
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── constants/        # App constants & config
└── styles/           # Global styles
```

## 📄 License
Private — Achievement Academy
