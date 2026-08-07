# TASK Mobile — Feature & Stack Document (Pre-UAT)

**Product:** TASK Mobile (Telangana Academy for Skill and Knowledge)  
**Version:** 1.0.0 (demo / mock-backend build)  
**Document purpose:** Handover for UAT team before live testing  
**Project path:** `C:\Users\gudas\Projects\task-mobile`  
**Aligned with:** [task.telangana.gov.in](https://task.telangana.gov.in/) portal concepts (college, student, trainer, admin flows)

---

## 1. What this build is

A **cross-platform mobile app prototype** (Android / iOS / Web via Expo) that covers the main TASK stakeholder journeys:

- College enrollment & college admin portal  
- Student registration & training session participation  
- Trainer registration, approval, session delivery  
- TASK Admin operations  
- Super Admin overview & easy reports  

**Important for UAT:** This build uses a **local mock API (AsyncStorage)**. Data stays on the device/browser. There is **no live TASK backend integration yet**. OTPs, file uploads, and payments are **demo behaviour**.

---

## 2. Technology stack

| Layer | Technology |
|--------|------------|
| Framework | **Expo SDK ~57** + **React Native 0.86** |
| Language | **TypeScript** |
| UI runtime | React 19 / React DOM (web) |
| Navigation | React Navigation 7 (native stack) |
| Local storage / mock DB | `@react-native-async-storage/async-storage` |
| Forms / pickers | `@react-native-picker/picker`, `@react-native-community/datetimepicker` |
| Platforms | **Web** (primary demo), Android, iOS |
| Auth session | Client-side session in AsyncStorage |
| Backend | **Mock services only** (no REST/GraphQL yet) |

### How to run (for UAT environment)

```bash
cd C:\Users\gudas\Projects\task-mobile
npm install
npx expo start --web
```

Typical local URL: `http://localhost:8081` or `http://localhost:8082` (port may vary).

---

## 3. Roles & demo credentials

On **Sign In**, select the role first (credentials autofill for demos).

| Role | Email | Password | Notes |
|------|--------|----------|--------|
| **Super Admin** | `superadmin@task.telangana.gov.in` | `SuperAdmin@123` | Platform overview + easy CSV reports |
| **TASK Admin** | `admin@task.telangana.gov.in` | `TaskAdmin@123` | Approvals, courses, trainers, assignments |
| **College Admin** | `admin@vivekananda-demo.ac.in` | `College@123` | Demo college portal |
| **Student** | `student.demo@gmail.com` | `Student@123` | Demo student |
| **Trainer (approved)** | `trainer.demo@task.telangana.gov.in` | `Trainer@123` | Ananya Reddy — full trainer workspace |
| **Trainer (apply seed)** | `trainer.apply@gmail.com` | `Apply@1234` | Registration test seed (OTP flow) |

### Demo OTPs (all flows)

| Channel | OTP |
|---------|-----|
| Email | `111111` |
| Mobile | `222222` |

---

## 4. Features delivered (by module)

### 4.1 Common

- Welcome screen with registration type dropdown (College / Student / Trainer)  
- Sign In by role  
- Forgot password (demo OTP)  
- Edit profile / change password (role-aware)  
- TASK branding (logo, teal theme)

### 4.2 College registration & TASK Admin review

- Official email + mobile OTP gate  
- Full college registration form (institution, affiliation, contact, fee acknowledgment)  
- Application status: pending / approved / rejected  
- TASK Admin review with regional center assignment  
- Notifications to college on approve/reject  

### 4.3 College Admin portal

Menu:

| Menu | What it does |
|------|----------------|
| Overview | College summary, latest updates, upcoming trainings, quick counts |
| Students | College student list / search |
| Courses | TASK course catalogue → request a course |
| Request for a Course | Create/view course requests (branch, dates, batch size) |
| Calendar | Approved trainings by month |
| **Batch Progress** | Attendance %, submissions, certificates, eligible counts per batch |
| **Reports** | Progress / attendance / submissions / certificates + CSV export |
| College Renewal/Payment | Renewal / payment panel (demo) |

Also:

- Course request detail with **trainer assignment visibility** (name, email, mobile, skills, etc.)  
- Latest updates when TASK Admin approves/rejects or assigns trainers  

### 4.4 Student

- Student OTP + registration (college-linked, category, fee logic for SC/ST demo concession)  
- Student dashboard (profile + registrations)  
- Browse training sessions (strict filter: same college + branch + graduation year)  
- Register / cancel for approved batches  
- **Session workspace** after registration:  
  - Materials  
  - Assignments (submit / resubmit)  
  - Attendance history  
  - Certificates  
  - Feedback to trainer  
  - Queries to trainer  

### 4.5 Trainer

- Created only by TASK Admin (no public self-registration)  
- Admin sets profile + login credentials; trainer signs in as **Trainer**  
- Status: active / inactive  
- Trainer dashboard:  
  - Sessions (open session workspace)  
  - Docs (resume / certs / achievements)  
  - History  
  - Feedback (aggregate)  
- **Session workspace** (per assigned batch):  
  - Materials upload  
  - Assignments + review student submissions (Accept / Needs revision)  
  - Attendance (single + **multi-select bulk** Present/Late/Absent)  
  - Certificates (eligibility + bulk issue)  
  - Feedback (session-scoped)  
  - Queries (answer students)  

### 4.6 Certificate rules (enforced)

A certificate can be issued only if:

1. **Attendance ≥ 75%** (Present or Late across marked session days)  
2. **All posted assignments accepted** by the trainer  

Issuing a certificate marks the student’s registration as **completed**.

### 4.7 TASK Admin

- Actions inbox (college approvals, course approvals, assign/edit trainers)  
- Course catalogue CRUD  
- Trainers directory — create/edit trainers and credentials  
- Assign primary + optional backup trainer to approved course requests  
- Edit assignment after save  

### 4.8 Super Admin

Simplified command center:

| Tab | Content |
|-----|---------|
| **Home** | At-a-glance counts, “Needs your attention”, simple batch list, shortcuts to manage |
| **Easy reports** | 3 downloads only: Batch progress, Attendance sheet, Certificates |

Shortcuts into TASK Admin tools for operational work (approvals, courses, trainers).

---

## 5. Suggested UAT test scenarios

### A. College → Admin → Calendar
1. Sign in as College Admin (demo).  
2. Request a course for a branch/year.  
3. Sign in as TASK Admin → approve request.  
4. Assign trainer (Ananya Reddy).  
5. College Calendar / Batch Progress should show trainer + progress.  

### B. Trainer delivery
1. Sign in as Trainer (demo).  
2. Open session workspace.  
3. Upload material + post assignment.  
4. Mark attendance (try bulk select).  
5. Review submissions when students submit.  
6. Issue certificate only after 75% + accepted assignments.  

### C. Student journey
1. Sign in as Student (demo).  
2. Browse sessions → register.  
3. Open session → view materials, submit assignment, ask query, give feedback.  
4. Check attendance + certificate tabs.  

### D. Super Admin reports
1. Sign in as Super Admin.  
2. Confirm Home numbers and attention list.  
3. Easy reports → download each of the 3 CSVs (web: copies to clipboard).  

### E. Negative / edge
1. Pending trainer cannot open full session tools.  
2. Student of wrong branch cannot see another branch’s batch.  
3. Certificate blocked when attendance &lt; 75% or assignments incomplete.  

---

## 6. Known demo limitations (call out to UAT)

| Area | Current behaviour | Production expectation |
|------|-------------------|------------------------|
| Backend | Local AsyncStorage mock | Real TASK APIs |
| OTP | Fixed demo OTPs | SMS/Email gateway |
| Files | Metadata only (mock picker) | Real upload / download / preview |
| Payments | Acknowledgment / demo panels | Payment gateway |
| Push notifications | In-app lists only | FCM / APNs |
| Multi-device sync | No shared server DB | Central database |
| Security | Demo passwords in client | SSO / secure auth |
| CSV export (web) | Clipboard copy | File download endpoint |

---

## 7. App structure (for developers / UAT support)

```
task-mobile/
  App.tsx
  src/
    components/          # UI shell, charts helpers, shared fields
    constants/           # Demo users, courses, lookups
    context/             # AuthContext
    navigation/          # Root stack + types
    screens/             # Role screens + college panels
    services/            # mockApi, collegePortalApi, trainerApi,
                         # trainingApi, sessionContentApi, reportsApi, accountApi
    types/               # Shared TypeScript models
    theme/               # Brand colors
```

---

## 8. Roles summary (one glance)

```
Super Admin  → Platform health + easy reports + jump to manage
TASK Admin   → Approve colleges/trainers/courses + assign trainers
College Admin→ Request courses + see progress/reports for own college
Trainer      → Deliver session: materials, attendance, assignments, certs, Q&A
Student      → Join session + materials, submit work, feedback, queries, certs
```

---

## 9. Recommendation before “go live” UAT

1. Host a stable Expo web build (or internal APK) for the UAT team.  
2. Share this document + demo credentials.  
3. Clear browser storage between major scenario resets if data looks “stuck”.  
4. Collect defects against **role + scenario ID** (A–E above).  
5. Treat this UAT as **functional / UX validation on mock data**, not production integration UAT.

---

## 10. Document control

| Field | Value |
|-------|--------|
| Build name | TASK Mobile |
| Build type | Expo TypeScript demo |
| Backend | Mock (AsyncStorage) |
| Prepared for | UAT team handover |
| Status | Ready for guided UAT on demo stack |

For questions during UAT, reproduce with the matching demo role credentials and note: device/browser, role, steps, expected vs actual.
