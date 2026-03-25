

## Plan: Phone required on signup + Pre-load profile data

### What's happening now
1. **Phone is optional** during signup — no validation check in Auth.tsx
2. **Profile data not pre-loaded** — the Profile page fetches from `profiles` table via `useAuth`, but the profile may not be available immediately after signup (the `fetchProfile` in `useAuth` runs on auth state change, but the upsert may not have completed yet, or the auth state change fires before the profile is written)

### Changes

**1. `src/pages/Auth.tsx`** — Make phone required on signup
- Add validation: if `mode === "signup"` and `form.phone.trim()` is empty, show error "El teléfono es requerido"
- Update the phone field label from "WhatsApp / Teléfono" to "WhatsApp / Teléfono *"

**2. `src/hooks/useAuth.tsx`** — Ensure profile is fetched after signup
- In `signUp`, after the `profiles.upsert` call, explicitly call `fetchProfile(data.user.id)` so the profile (name + phone) is immediately available in context without waiting for the next auth state change

**3. `src/pages/Profile.tsx`** — No changes needed
- It already reads from `profile` via `useAuth` and populates the form with `splitName(profile.name)` and `profile.phone`. The fix in step 2 ensures this data is available right after signup.

### No database changes needed
The `phone` column on `profiles` already exists and accepts text. The constraint is enforced client-side only (matching the original app pattern).

