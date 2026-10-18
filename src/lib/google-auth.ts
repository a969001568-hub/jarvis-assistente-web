/** No account hint: each user chooses their own Google identity. */
export function googleSignInOptions(origin: string) {
  return { redirect_uri: origin, extraParams: { prompt: 'select_account' } };
}