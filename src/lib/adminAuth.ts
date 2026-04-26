export async function canAccessOpenAIAdminRoutes(user: unknown): Promise<boolean> {
  return Boolean(user && typeof user === 'object')
}
