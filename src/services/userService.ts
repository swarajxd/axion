import type { SupabaseClient } from '@supabase/supabase-js';

export type UserProfileRow = {
  id: string;
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  stream: string | null;
  standard: string | null;
  target_exam: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

export type CreateUserProfileInput = {
  first_name: string;
  last_name: string;
  stream: string;
  standard: string;
  target_exam?: string | null;
};

export async function getUserProfile(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Returns:
 * - null if the user has no profile in Supabase
 * - the profile row otherwise
 */
export async function checkUserProfile(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<UserProfileRow | null> {
  return getUserProfile(supabase, clerkUserId);
}

export async function checkOnboardingStatus(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<{ needsOnboarding: boolean; profile: UserProfileRow | null }> {
  const profile = await getUserProfile(supabase, clerkUserId);
  if (!profile) return { needsOnboarding: true, profile: null };
  return { needsOnboarding: !profile.onboarding_completed, profile };
}

export async function createUserProfile(
  supabase: SupabaseClient,
  clerkUserId: string,
  data: CreateUserProfileInput
): Promise<void> {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      clerk_user_id: clerkUserId,
      first_name: data.first_name,
      last_name: data.last_name,
      stream: data.stream,
      standard: data.standard,
      target_exam: data.target_exam ?? null,
      onboarding_completed: true,
    },
    { onConflict: 'clerk_user_id' }
  );

  if (error) throw error;
}
