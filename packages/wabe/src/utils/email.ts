export const normalizeEmail = (email: unknown) =>
	typeof email === 'string' && email.trim().length > 0 ? email.trim().toLowerCase() : null
