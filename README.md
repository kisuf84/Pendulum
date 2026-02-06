# Pendulum

**A Personal Myth Engine**

Pendulum is not a productivity tool. It's an externalized intuition. A system that tracks your internal weather, detects patterns across time, and speaks back in the language of myth, not metrics.

It holds the thread while you're inside the labyrinth.

---

## Features

### Core
- **Permanent storage**: Your entries live in Supabase, synced across all devices
- **Google sign-in**: Secure authentication, no passwords
- **Custom seed/onboarding**: Each user creates their own context, intentions, and voice preference
- **Time awareness**: Pendulum knows when you last wrote, adjusts tone invisibly

### Philosophy in Design
- **Decay as design**: Old entries visually fade like memory
- **Text fragmentation**: Entries older than 30 days begin losing words. By 180 days, significant portions are gone. This teaches letting go through experience, not instruction.
- **Morning echo**: Write at night, receive a gentle callback the next morning
- **Silence as response**: Sometimes just "Noted." is enough
- **Streakless**: No guilt, no "welcome back", same presence whether it's been one day or thirty

---

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project named "pendulum"
3. Wait for it to initialize (~2 minutes)
4. Go to **Project Settings > API** and copy:
   - Project URL
   - anon/public key

### 2. Set Up the Database

Run BOTH SQL files in order:

1. In Supabase, go to **SQL Editor**
2. First, run `supabase-schema.sql` (creates entries table)
3. Then, run `supabase-migration-v2.sql` (creates user_profiles and morning_echoes tables)

### 3. Configure Google OAuth

1. In Supabase, go to **Authentication > Providers > Google**
2. Enable Google provider
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret to Supabase
7. Save

### 4. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 5. Deploy to Vercel

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. Add your Vercel URL to Google OAuth authorized redirect URIs

---

## The Ritual

Open Pendulum at night, when you're reflective.

Write whatever is present. A thought, a tension, an idea, a fear, a hope.

Let it respond.

One exchange is complete in itself. But you can continue if something sparks.

Over time, patterns emerge. The system learns what signals matter. Old entries fade, teaching you to stay present.

---

## Philosophy

Built for Issouf Konate by Claude.

Informed by:
- The Creative Act (Rick Rubin)
- The War of Art (Steven Pressfield)
- The Power of Your Subconscious Mind (Joseph Murphy)
- Breaking the Habit of Being Yourself (Joe Dispenza)
- The Alchemist (Paulo Coelho)
- The Storytelling Animal (Jonathan Gottschall)
- Stalking the Wild Pendulum (Itzhak Bentov)

Technology with Empathy.
