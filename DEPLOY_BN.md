# বিদ্যাঙ্গন — সম্পূর্ণ ডিপ্লয়মেন্ট গাইড (বাংলা)

এই গাইড ধরে নিচ্ছে তুমি এখনো কিছুই ডিপ্লয় করোনি — একদম শুরু থেকে শেষ পর্যন্ত, প্রতিটা ধাপ, প্রতিটা বাটন কোথায় ক্লিক করবে, সব লেখা আছে।

মোট ৫টা ধাপ:
1. Supabase-এ প্রজেক্ট বানানো ও ডাটাবেস সেটআপ
2. প্রথম Super Admin অ্যাকাউন্ট বানানো (একবারই manually করতে হবে)
3. কোড GitHub-এ পুশ করা
4. Vercel-এ ডিপ্লয় করা ও Environment Variable বসানো
5. ডিপ্লয়ের পর Supabase-এর কিছু সেটিং ঠিক করা

---

## ধাপ ১ — Supabase প্রজেক্ট বানানো

### ১.১ অ্যাকাউন্ট ও প্রজেক্ট

1. ব্রাউজারে যাও **[supabase.com](https://supabase.com)** → **Start your project** / **Sign In**
2. GitHub দিয়ে সাইন-ইন করলে সবচেয়ে সহজ হবে (একই GitHub অ্যাকাউন্ট পরে Vercel-এও কাজে লাগবে)
3. Dashboard-এ ঢুকে **New Project** বাটনে ক্লিক করো
4. ফর্ম পূরণ করো:
   - **Name**: `biddyangon` অথবা `biddyangon-prod` (যা খুশি, শুধু মনে রাখার মতো নাম)
   - **Database Password**: একটা শক্ত পাসওয়ার্ড দাও এবং **এটা কোথাও সেভ করে রাখো** (নোটপ্যাডে/পাসওয়ার্ড ম্যানেজারে) — এটা ডাটাবেসের রুট পাসওয়ার্ড, পরে দরকার পড়তে পারে
   - **Region**: **Singapore (ap-southeast-1)** বেছে নাও — বাংলাদেশ থেকে সবচেয়ে কাছের, দ্রুত হবে
   - **Pricing Plan**: শুরুতে **Free** দিয়েই চালানো যাবে
5. **Create new project** চাপো — প্রজেক্ট তৈরি হতে ১-২ মিনিট লাগবে (একটা লোডিং স্ক্রিন দেখাবে)

### ১.২ ডাটাবেস স্কিমা রান করা (৩টা ফাইল, ক্রম অনুযায়ী)

প্রজেক্ট রেডি হলে বাম পাশের মেনু থেকে **SQL Editor** আইকনে ক্লিক করো (একটা `</>` মার্কের মতো আইকন)।

**প্রথম ফাইল:**
1. **+ New query** চাপো
2. তোমার ডাউনলোড করা zip-এর ভেতর `supabase/schema.sql` ফাইলটা খোলো (যেকোনো টেক্সট এডিটর দিয়ে, যেমন Notepad বা VS Code)
3. পুরো কনটেন্ট কপি করে SQL Editor-এর বক্সে পেস্ট করো
4. ডান দিকে নিচে **Run** বাটনে চাপো (অথবা Ctrl+Enter)
5. নিচে "Success. No rows returned" এর মতো একটা মেসেজ দেখা উচিত

**দ্বিতীয় ফাইল:**
1. আবার **+ New query**
2. `supabase/storage.sql` ফাইলের কনটেন্ট কপি-পেস্ট করো
3. **Run** চাপো

**তৃতীয় ফাইল (এটাই সবচেয়ে গুরুত্বপূর্ণ — security fix):**
1. আবার **+ New query**
2. `supabase/security_patch.sql` ফাইলের কনটেন্ট কপি-পেস্ট করো
3. **Run** চাপো
4. যদি নিচে কোনো "NOTICE" মেসেজ আসে (যেমন academic_sessions নিয়ে), সেটা শুধু তথ্যের জন্য, error না — চিন্তার কিছু নেই

তিনটা রান শেষ হলে বাম মেনুতে **Table Editor**-এ গিয়ে দেখো — `institutes`, `profiles`, `students`, `marks`, `results` ইত্যাদি অনেকগুলো টেবিল তৈরি হয়ে গেছে।

**Storage bucket চেক করা:** বাম মেনুতে **Storage** আইকনে ক্লিক করো — সেখানে ৩টা bucket দেখা উচিত: `institute-logos`, `student-photos`, `notice-attachments`।

---

## ধাপ ২ — প্রথম Super Admin বানানো (একমাত্র manual ধাপ)

এখন থেকে Institute Head, Teacher, Student — এদের সবার অ্যাকাউন্ট **অ্যাপের ভেতর থেকেই UI দিয়ে** বানানো যাবে (আগে যেটা raw SQL লাগতো, এখন লাগে না)। কিন্তু **প্রথম Super Admin অ্যাকাউন্টটা** কাউকে না কাউকে হাতে বানাতেই হবে, কারণ তাকে বানানোর জন্য অন্য কোনো Super Admin নেই।

### ২.১ Auth User বানানো

1. বাম মেনু থেকে **Authentication** → **Users** ট্যাবে যাও
2. **Add user** বাটনে ক্লিক করো → **Create new user**
3. পূরণ করো:
   - **Email**: `admin@biddyangon.local` (বা তোমার পছন্দমতো যেকোনো ভ্যালিড-ফরম্যাটের ইমেইল, real ইমেইল হতে হবে না)
   - **Password**: একটা শক্ত পাসওয়ার্ড
   - **Auto Confirm User**: ✅ টিক দাও (এটা জরুরি — না হলে ইমেইল ভেরিফাই ছাড়া লগইন করতে পারবে না)
4. **Create user** চাপো
5. তৈরি হওয়া ইউজারের লিস্টে ক্লিক করলে ওপরে একটা **User UID** দেখাবে (একটা লম্বা code, যেমন `a1b2c3d4-...`) — এটা কপি করে রাখো

### ২.২ প্রোফাইল লিংক করা

1. আবার **SQL Editor** → **+ New query**
2. নিচের কোডটা পেস্ট করো, শুধু `<PASTE_UUID_HERE>` জায়গায় উপরে কপি করা UUID বসাও:

```sql
insert into profiles (id, institute_id, role, username, full_name, email, must_change_password)
values (
  '<PASTE_UUID_HERE>',
  null,
  'super_admin',
  'superadmin',
  'Platform Admin',
  'admin@biddyangon.local',
  false
);
```

3. **Run** চাপো

ব্যস — এখন `superadmin` ইউজারনেম আর তোমার দেওয়া পাসওয়ার্ড দিয়ে লগইন করা যাবে। এই Super Admin অ্যাকাউন্ট থেকেই এখন প্রথম Institute (যেমন তোমার Tamirul Millat Kamil Madrasa Tongi) আর তার Head Account — দুটোই UI থেকে বানাতে পারবে, আর কোনো SQL লাগবে না।

---

## ধাপ ৩ — কোড GitHub-এ পুশ করা

তোমার কম্পিউটারে Terminal/Command Prompt খুলে, zip ফাইলটা extract করা ফোল্ডারে গিয়ে:

```bash
cd biddyangon-app
git init
git add .
git commit -m "Initial Biddyangon release"
git branch -M main
```

এবার GitHub-এ গিয়ে (**github.com** → **New repository**) একটা খালি রিপো বানাও (নাম `biddyangon`, Private রাখাই ভালো)। তারপর:

```bash
git remote add origin https://github.com/<তোমার-ইউজারনেম>/biddyangon.git
git push -u origin main
```

**নিশ্চিত হও এগুলো push হচ্ছে না** (`.gitignore`-এ আগে থেকেই বাদ দেওয়া আছে, তবু চোখ বুলিয়ে নাও):
- `.env.local`
- `node_modules`
- `.next`

---

## ধাপ ৪ — Vercel-এ ডিপ্লয়

### ৪.১ প্রজেক্ট ইম্পোর্ট

1. **[vercel.com](https://vercel.com)** → GitHub দিয়ে সাইন-ইন করো
2. **Add New...** → **Project**
3. তোমার `biddyangon` রিপোটা লিস্টে দেখাবে — তার পাশে **Import** চাপো
4. Framework Preset এমনিতেই **Next.js** ডিটেক্ট হয়ে যাবে, কিছু বদলানোর দরকার নেই

### ৪.২ Environment Variables বসানো (এখানেই সব API key লাগবে)

Import পেজেই একটা **Environment Variables** সেকশন থাকবে (অথবা Deploy করার পর **Settings → Environment Variables** থেকে যোগ করতে পারবে)। তিনটা variable লাগবে:

| Variable নাম | কোথায় পাবে |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → **Project Settings** (বাম মেনুর নিচে gear আইকন) → **API** → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | একই পেজে → **Project API keys** → **anon public** (নতুন Supabase UI-তে একে "publishable" ও বলতে পারে) |
| `SUPABASE_SERVICE_ROLE_KEY` | একই পেজে → **Project API keys** → **service_role** — ⚠️ **এটা secret**, `NEXT_PUBLIC_` prefix দিও না। এটা এখন Bulk Student Import আর Teacher/Head তৈরির জন্য সত্যিই ব্যবহার হচ্ছে (আগে ছিল কিন্তু ব্যবহৃত হতো না, এখন করে) |

প্রতিটা variable-এর জন্য:
- Vercel-এর ফর্মে **Name** আর **Value** বসাও
- **Environments** থেকে **Production**, **Preview**, **Development** — তিনটাই টিক দিয়ে রাখো (`SUPABASE_SERVICE_ROLE_KEY`-এর জন্য চাইলে শুধু Production+Preview রাখতে পারো, Development-এ না দিলেও চলবে)

### ৪.৩ Deploy

**Deploy** বাটনে চাপো। ২-৩ মিনিটের মধ্যে একটা লিংক পাবে, যেমন `https://biddyangon.vercel.app`

> **মনে রাখবে:** পরে যদি কোনো environment variable বদলাও বা নতুন যোগ করো, Vercel নিজে থেকে redeploy করে না — Settings থেকে **Redeploy** চাপতে হবে (অথবা GitHub-এ নতুন কমিট পুশ করলে এমনিই হয়ে যায়)।

---

## ধাপ ৫ — ডিপ্লয়ের পর Supabase-এর সেটিং ঠিক করা

লগইন/রিডাইরেক্ট ঠিকমতো কাজ করার জন্য এই সেটিংগুলো করা জরুরি:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**-এ বসাও তোমার Vercel লিংক: `https://biddyangon.vercel.app`
3. **Redirect URLs**-এ যোগ করো:
   ```
   https://biddyangon.vercel.app/**
   http://localhost:3000/**
   ```
4. **Authentication** → **Providers** → **Email** এ গিয়ে দেখো Email provider enabled আছে কিনা (ডিফল্টে থাকে)
5. **Authentication** → **Rate Limits** — ডিফল্ট ভ্যালুগুলো ঠিক আছে, বাড়ানোর দরকার নেই (username enumeration ঠেকাতে এটা সাহায্য করে)

এবার `https://biddyangon.vercel.app/login`-এ গিয়ে তোমার `superadmin` অ্যাকাউন্ট দিয়ে লগইন করো। এখান থেকে:
- **Institutes** পেজে গিয়ে প্রথম institute বানাও (নাম, shortcut যেমন `tmkmt`)
- সেই institute-এর পাশে **+ Head Account** চাপলেই username আর temporary password জেনারেট হয়ে যাবে — সেটা copy করে Head-কে দিয়ে দাও
- Head লগইন করে **Classes & Sections**, **Teachers** (+ Add Teacher বাটন দিয়ে), **Students** (Bulk Import CSV দিয়ে) — সব বানাতে পারবে, আর কোনো SQL লাগবে না

---

## নিজের কম্পিউটারে লোকালি রান করতে চাইলে (ঐচ্ছিক, টেস্টের জন্য)

```bash
cd biddyangon-app
cp .env.example .env.local
```

`.env.local` ফাইলটা খুলে ওপরের টেবিলের তিনটা ভ্যালু বসাও (Vercel-এ যেগুলো দিয়েছিলে, ঠিক সেগুলোই)।

```bash
npm install
npm run dev
```

ব্রাউজারে যাও `http://localhost:3000/login`

---

## কোথায় কী — কুইক রেফারেন্স টেবিল

| তুমি যা করতে চাও | কোথায় করবে |
|---|---|
| Supabase Project URL / anon key / service role key | Supabase → Project Settings → API |
| ডাটাবেস স্কিমা রান | Supabase → SQL Editor |
| Storage bucket দেখা | Supabase → Storage |
| প্রথম Super Admin বানানো | Supabase → Authentication → Users, তারপর SQL Editor (একবারই) |
| নতুন Institute + Head বানানো | অ্যাপ → Super Admin লগইন → /dashboard/institutes |
| নতুন Teacher বানানো | অ্যাপ → Institute Head লগইন → /dashboard/teachers → + Add Teacher |
| Student বাল্ক import | অ্যাপ → Institute Head → /dashboard/students → Bulk Import (CSV) |
| Fee Type / Grading Policy বদলানো | অ্যাপ → Institute Head → /dashboard/settings/fees অথবা /settings/grading |
| Environment Variables (production) | Vercel → Project → Settings → Environment Variables |
| Site URL / Redirect URL | Supabase → Authentication → URL Configuration |
| Custom domain যোগ | Vercel → Project → Settings → Domains (তারপর Supabase-এর Site URL-ও আপডেট করতে ভুলো না) |

---

## যদি কোনো ধাপে আটকে যাও

- **"Invalid login credentials"** — username বানানোর নিয়ম মনে করো: `{institute-shortcut}-{student-id}` (যেমন `tmkmt-244874`) অথবা `{shortcut}-head`, `{shortcut}-T-00001`। ভুল username দিলে login কাজ করবে না।
- **Class বানাতে গিয়ে error** — নিশ্চিত করো ওই institute-এর জন্য একটা `academic_sessions` row আছে (security_patch.sql-এর trigger নতুন institute-এর জন্য এটা এখন নিজে থেকেই বানিয়ে দেয়, তবু পুরনো institute হলে ম্যানুয়ালি একটা বসাতে হতে পারে)।
- **Bulk Import কাজ করছে না / "SUPABASE_SERVICE_ROLE_KEY is not set" এরর** — Vercel-এ ওই environment variable ঠিকমতো বসানো আছে কিনা, আর বসানোর পর Redeploy করেছো কিনা চেক করো।
- **কোনো পেজ সাদা/ফাঁকা দেখাচ্ছে** — এখন `app/dashboard/error.tsx` আছে, তাই crash হলে একটা "Something went wrong" মেসেজ দেখানোর কথা, পুরো সাদা পেজ না। যদি একদম সাদা দেখো, ব্রাউজারের DevTools (F12) → Console ট্যাবে গিয়ে error মেসেজটা দেখো।
