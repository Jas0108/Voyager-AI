# Voyager AI — Public Deployment & User Testing Guide

Follow this simple, step-by-step guide to deploy **Voyager AI** for free and share it with users.

---

## PART 1: Deploy Backend to Render (5 Minutes)

### Step 1.1: Create Render Account
1. Visit [render.com](https://render.com) and click **Sign Up**.
2. Sign in using your **GitHub account**.

### Step 1.2: Create Web Service
1. On the Render Dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Choose your repository: `Jas0108/Voyager-AI`.

### Step 1.3: Configure Service Settings
Fill in the following fields carefully:

| Field | Value |
| :--- | :--- |
| **Name** | `voyager-ai-backend` |
| **Region** | Choose closest to you (e.g. Singapore / US East) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Step 1.4: Add Environment Variables
Scroll down to **Environment Variables** and click **Add Environment Variable** for each of the following:

| Key | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `GROQ_API_KEY` | Your Groq API Key (if used) |
| `SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `SUPABASE_KEY` | Your Supabase Anon Key |
| `DATABASE_URL` | Your Supabase PostgreSQL Connection String |
| `JWT_SECRET` | Secret key for JWT auth tokens |
| `CORS_ORIGINS` | `*` (or your frontend Vercel URL once created) |

### Step 1.5: Deploy Backend
1. Click **Create Web Service**.
2. Wait 2–3 minutes while Render installs requirements and builds your backend.
3. Once complete, copy your live backend URL from the top left corner (e.g. `https://voyager-ai-backend.onrender.com`).

---

## PART 2: Deploy Frontend to Vercel (3 Minutes)

### Step 2.1: Create Vercel Account
1. Visit [vercel.com](https://vercel.com) and click **Sign Up**.
2. Sign in with **GitHub**.

### Step 2.2: Import Project
1. On the Vercel Dashboard, click **Add New...** → **Project**.
2. Find `Jas0108/Voyager-AI` and click **Import**.

### Step 2.3: Configure Project Settings
1. Set **Root Directory**:
   - Click **Edit** next to Root Directory.
   - Select `frontend` and click **Save**.

2. Open **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://voyager-ai-backend.onrender.com` (Your Render URL from Part 1) |

### Step 2.4: Deploy Frontend
1. Click **Deploy**.
2. Vercel will build the Next.js frontend in under 60 seconds.
3. Once completed, Vercel will present a live domain (e.g., `https://voyager-ai.vercel.app`).

---

## PART 3: Verify & Test Live Application

1. Open your live Vercel URL (`https://voyager-ai.vercel.app`).
2. Register a new user account (e.g. `testuser`).
3. Click **Trip Suggestions** or **New Trip** to test creating a trip workspace.
4. Open the AI Assistant inside your trip to test itinerary generation!

---

## PART 4: Gathering User Feedback

1. **Share Your Link**: Send `https://voyager-ai.vercel.app` to 5–10 friends or testers.
2. **Collect Feedback**: Ask them to try planning a 3-day or 5-day trip and ask:
   - *Was the itinerary helpful?*
   - *Was the interface clean and easy to navigate?*
   - *What features should we add next?*
