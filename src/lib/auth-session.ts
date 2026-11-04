import type { User } from '@supabase/supabase-js';

export type AuthState = { user: User | null; ready: boolean; error?: string };
type AuthClient = {
  getUser: () => Promise<{ data: { user: User | null } }>;
  onAuthStateChange: (callback: (event: string, session: { user: User } | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
};
export const AUTH_UNAVAILABLE = 'O login está temporariamente indisponível. A conexão com o Lovable Cloud precisa ser restaurada.';

/** Initialization can throw synchronously when deployment config is absent. */
export function observeAuth(getClient: () => AuthClient, update: (state: AuthState) => void, changed: (event: string) => void) {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  const failed = () => { if (active) update({ user: null, ready: true, error: AUTH_UNAVAILABLE }); };
  try {
    const client = getClient();
    void client.getUser().then(({ data }) => { if (active) update({ user: data.user, ready: true }); }).catch(failed);
    const { data } = client.onAuthStateChange((event, session) => {
      if (!active) return;
      update({ user: session?.user ?? null, ready: true });
      changed(event);
    });
    unsubscribe = () => data.subscription.unsubscribe();
  } catch { failed(); }
  return () => { active = false; unsubscribe?.(); };
}