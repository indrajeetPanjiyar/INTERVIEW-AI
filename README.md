# INTERVIEW-AI — Interview Strategy Generator 🐇🤖

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-ISC-blue)

## Project Overview

Interview-AI is a full-stack web application that helps job candidates generate tailored interview strategies and ATS-friendly resumes using AI. Users upload a resume (or provide a self-description) and a target job description — the app analyzes the inputs using Google GenAI (Gemini) to produce:

- a match score
- technical and behavioral interview questions with model answers
- a day-by-day preparation plan
- identified skill gaps
- a downloadable, tailored resume PDF

Target users: job-seekers who want an AI-powered, structured approach to interview prep and resume tailoring.

Problem solved: reduces time spent preparing for interviews, surfaces high-impact study tasks, and generates ready-to-download resumes tailored to specific job descriptions.

---

## Features

### Backend Features

- User authentication (register, login, logout)
- JWT-based authentication stored in an HTTP cookie
- Token blacklist for logout invalidation
- File upload (resume) handling using `multer` (in-memory storage)
- AI integration with Google GenAI to generate interview reports and resume HTML
- PDF generation using `puppeteer` from AI-produced HTML
- Mongoose models for users, interview reports, and token blacklist
- Routes for generating reports, fetching single/all reports, and producing resume PDFs

### Frontend Features

- React single-page app using React Router
- Pages: Login, Register, Home (create report), Interview (view report)
- Auth flow with context (`AuthContext`) and `useAuth` hook
- Interview flow with context (`InterviewContext`) and `useInterview` hook
- File upload UI for resume, text areas for job description and self-description
- Download resume PDF feature

### AI Features

- Uses `@google/genai` client (Gemini model `gemini-2.5-flash`) to:
  - Generate structured interview reports (JSON) following strict schema
  - Generate resume HTML tailored to a job description
- Prompts enforce strict JSON output which is parsed and saved into DB

---

## Tech Stack

- Frontend: React, React Router, Vite, Axios, Sass
- Backend: Node.js, Express
- Database: MongoDB via Mongoose
- Authentication: JWT stored in HTTP cookie, token blacklist model
- AI/LLM: Google GenAI (`gemini-2.5-flash`) via `@google/genai`
- PDF generation: Puppeteer
- File upload: Multer (memoryStorage)

---

## Project Architecture & Folder Structure

Top-level layout:

- `Backend/` — Express server, routes, controllers, models, middlewares, services
  - `server.js` — app bootstrap and DB connection
  - `src/app.js` — express configuration and route mounts
  - `src/config/database.js` — mongoose connection (reads `process.env.MONGO_URI`)
  - `src/routes/` — route definitions (`auth.routes.js`, `interview.routes.js`)
  - `src/controller/` — business logic for routes (`auth.controller.js`, `interview.controller.js`)
  - `src/models/` — Mongoose models (`user.model.js`, `interviewReport.model.js`, `blacklist.model.js`)
  - `src/middlewares/` — `auth.middleware.js` (JWT verification + blacklist check), `file.middleware.js` (multer)
  - `src/services/ai.service.js` — AI prompt orchestration and PDF generation helpers

- `Frontend/` — React SPA
  - `src/App.jsx` — top-level providers
  - `src/app.routes.jsx` — router configuration
  - `src/features/auth/` — contexts, hooks, pages, and service (`auth.api.js`)
  - `src/features/interview/` — contexts, hooks, pages, and service (`interview.api.js`)

Design patterns used:

- Context + hooks pattern for global state (`AuthContext`, `InterviewContext`)
- Controller-service-model separation on backend
- Schema validation hints in `ai.service.js` using `zod` (prompt schema defined for strict JSON)

---

## Database Schema (Mongoose)

All models are implemented with Mongoose (MongoDB).

- `users` (defined in `src/models/user.model.js`)
  - Fields: `username` (String, unique), `email` (String, unique), `password` (String, hashed)
  - Purpose: store registered users

- `InterviewReport` (defined in `src/models/interviewReport.model.js`)
  - Fields:
    - `title` (String) — job title
    - `jobDescription` (String)
    - `resume` (String) — full resume text parsed from uploaded PDF
    - `selfDescription` (String)
    - `matchScore` (Number, 0-100)
    - `technicalQuestions` (Array of objects: `{question, intention, answer}`)
    - `behavioralQuestions` (Array of objects: `{question, intention, answer}`)
    - `skillGaps` (Array `{skill, severity: low|medium|high}`)
    - `preparationPlan` (Array `{day, focus, tasks: [String]}`)
    - `user` (ObjectId, ref: `users`) — owner of the report
    - Timestamps: `createdAt`, `updatedAt`
  - Purpose: store AI-generated interview reports and metadata

- `blacklistTokens` (defined in `src/models/blacklist.model.js`)
  - Fields: `token` (String), timestamps
  - Purpose: track invalidated JWTs after logout

Relationships:

- `InterviewReport.user` references `users._id` (one-to-many: one user → many interview reports)

---

## API Documentation

All endpoints are prefixed with `/api` and served from the backend on `http://localhost:3000`.

Authentication: the server sets a cookie named `token` containing a JWT. Protected routes require this cookie.

### Auth Routes

| Route                | Method | Purpose                                  | Request Params | Request Body                    | Response                                                                | Auth                          |
| -------------------- | -----: | ---------------------------------------- | -------------- | ------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `/api/auth/register` |   POST | Register a new user                      | —              | `{ username, email, password }` | `{ message, user: { id, username, email } }` (201)                      | No                            |
| `/api/auth/login`    |   POST | Login with email/password                | —              | `{ email, password }`           | `{ message, user: { id, username, email } }` (200) — cookie `token` set | No                            |
| `/api/auth/logout`   |    GET | Logout: clear cookie and blacklist token | —              | —                               | `{ message }` (200) — clears cookie and stores token in blacklist       | No                            |
| `/api/auth/get-me`   |    GET | Get current logged-in user info          | —              | —                               | `{ message, user: { id, username, email } }` (200)                      | Yes — cookie `token` required |

### Interview Routes

| Route                                          | Method | Purpose                                         | Request Params                  | Request Body / Form                                                              | Response                                                                        | Auth                 |
| ---------------------------------------------- | -----: | ----------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| `/api/interview/`                              |   POST | Generate interview report (AI) and save it      | —                               | FormData: `jobDescription` (string), `selfDescription` (string), `resume` (file) | `{ message, interviewReport }` (201)                                            | Yes (cookie `token`) |
| `/api/interview/report/:interviewId`           |    GET | Get a specific interview report by id           | `interviewId` (URL param)       | —                                                                                | `{ message, interviewReport }` (200) or 404                                     | Yes                  |
| `/api/interview/`                              |    GET | Get all interview reports for logged-in user    | —                               | —                                                                                | `{ message, interviewReports: [...] }` (200) — resume & long fields are omitted | Yes                  |
| `/api/interview/resume/pdf/:interviewReportId` |   POST | Generate/download resume PDF for a saved report | `interviewReportId` (URL param) | —                                                                                | Binary PDF stream (Content-Type: application/pdf)                               | Yes                  |

Notes about responses:

- Error responses use appropriate HTTP status codes (400, 401, 404).
- The interview generation endpoint calls `ai.service.generateInterviewReport(...)` which returns structured JSON and is stored directly in DB.

---

## Authentication Flow

- Registration: POST `/api/auth/register` with `{ username, email, password }`. Password is hashed with `bcryptjs`. On success the server signs a JWT and sets a `token` cookie.
- Login: POST `/api/auth/login` with `{ email, password }`. On success the server signs a JWT and sets the `token` cookie.
- JWT/Cookie: JWT contains `{ id, username }` and is signed using `process.env.JWT_SECRET`. The client uses `axios` with `withCredentials: true` so cookies are forwarded.
- Protected routes: middleware `auth.middleware.authUser` reads `req.cookies.token`, checks blacklist, verifies JWT, and attaches `req.user`.
- Logout: GET `/api/auth/logout` — server reads cookie token and stores it in `blacklistTokens`, then clears the cookie. Blacklisted tokens are rejected by the auth middleware.

---

## Frontend Pages & Components

- `/login` — `Login.jsx`
  - Purpose: sign in users; calls `auth.api.login`

- `/register` — `Register.jsx`
  - Purpose: create new users; calls `auth.api.register`

- `/` (Home) — `Home.jsx`
  - Purpose: create a new interview report. Upload resume or provide quick self-description and target job description. Calls `interview.api.generateInterviewReport`.
  - Major components: upload dropzone, job description textarea, recent reports list.

- `/interview/:interviewId` — `Interview.jsx`
  - Purpose: view the generated report (technical & behavioral questions, skill gaps, preparation plan). Allows downloading resume via `interview.api.generateResumePdf`.
  - Major components: `QuestionCard`, `RoadMapDay`, left navigation, sidebar with match score and skill gaps.

- `Protected.jsx` — guards protected routes using `useAuth` and redirects to `/login` if not authenticated.

- Contexts & Hooks:
  - `AuthContext` + `useAuth` — handles user state, login/register/logout/getMe.
  - `InterviewContext` + `useInterview` — handles generation, retrieval, and download of reports.

---

## AI Integration Details

- The AI functionality lives in `Backend/src/services/ai.service.js`.
- `generateInterviewReport({ resume, selfDescription, jobDescription })`:
  - Crafts a prompt containing resume, self description, and job description.
  - Requests the model `gemini-2.5-flash` via `@google/genai`.
  - Expects and enforces strict JSON with fields: `matchScore`, `title`, `technicalQuestions`, `behavioralQuestions`, `skillGaps`, `preparationPlan`.
  - The response is parsed and saved to the `InterviewReport` model.

- `generateResumePdf({ resume, selfDescription, jobDescription })`:
  - Sends a prompt asking for an `html` field (a full HTML resume).
  - Parses the AI JSON response and converts HTML to PDF using Puppeteer. Note: Puppeteer is launched with an explicit `executablePath` pointing to `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe` in the code.

Security note: AI prompts and model keys are environment protected (`GOOGLE_GENAI_API_KEY`). The app expects the model to return strict JSON — incorrect model outputs may cause parsing errors.

---

## Environment Variables

Create a `.env` in `Backend/` with the following variables (do NOT commit secrets):

| Variable               | Description                    | Example                                  |
| ---------------------- | ------------------------------ | ---------------------------------------- |
| `MONGO_URI`            | MongoDB connection string      | `mongodb://localhost:27017/interview-ai` |
| `JWT_SECRET`           | Secret used to sign JWT tokens | `a_strong_jwt_secret`                    |
| `GOOGLE_GENAI_API_KEY` | API key for Google GenAI       | `sk-...`                                 |

The server currently listens on port `3000` (hard-coded in `server.js`).

---

## Installation & Local Development

### Backend

1. Open terminal in `Backend/`
2. Install dependencies:

```bash
cd Backend
npm install
```

3. Create `.env` file with `MONGO_URI`, `JWT_SECRET`, and `GOOGLE_GENAI_API_KEY`.

4. Start development server:

```bash
npm run dev
```

The server runs on `http://localhost:3000`.

### Frontend

1. Open terminal in `Frontend/`
2. Install dependencies:

```bash
cd Frontend
npm install
```

3. Start dev server:

```bash
npm run dev
```

The frontend expects the backend at `http://localhost:3000` and uses credentials (cookies) for auth.

---

## Usage Guide

1. Register a new account via `/register`.
2. Login via `/login` (the backend sets a cookie named `token`).
3. On the Home page, paste a job description and either upload your resume (PDF/DOCX) or provide a short self-description.
4. Click `Generate My Interview Strategy`. Wait ~30s while AI generates the report.
5. View the saved report from the list or open `/interview/:id` to review technical questions, behavioral questions, skill gaps, and the 14+ day preparation plan.
6. Use `Download Resume` to get a tailored PDF created by the AI + Puppeteer flow.

---

## Screenshots

Add screenshots in these locations:

- Home / Generate form — insert image here
- Interview report — insert image here
- Login / Register — insert image here

Example markdown to add screenshots:

```md
![Home Page](./screenshots/home.png)
![Interview Report](./screenshots/report.png)
```

---

## Contributing

- Open an issue describing the change or bug.
- Fork the repo and create a feature branch: `git checkout -b feat/your-change`.
- Run linters/tests and open a pull request once ready.

Please follow the existing project style: small, focused commits and clear PR descriptions.

---

## License

This project is published under the ISC license (see `Backend/package.json`).

---
