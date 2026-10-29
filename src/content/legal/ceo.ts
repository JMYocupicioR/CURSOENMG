export const CEO_EMAIL = 'jmyocupicior@gmail.com';

export function isCeoEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === CEO_EMAIL;
}
