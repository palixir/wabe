import type { HookObject } from './HookObject'

/**
 * Secure-by-default ACL: scope a freshly created object to its creator (owner) so it is not
 * world-accessible. Only applied when we can determine the owner.
 */
const applyDefaultOwnerAcl = async (hookObject: HookObject<any, any>, ownerUserId?: string) => {
	if (!ownerUserId) return

	await hookObject.addACL('users', {
		userId: ownerUserId,
		read: true,
		write: true,
	})

	await hookObject.addACL('roles', null)
}

const setupAcl = async (hookObject: HookObject<any, any>) => {
	// Respect an ACL explicitly provided on the object (e.g. via input or another hook).
	if (hookObject.isFieldUpdated('acl')) return

	const schemaPermissionsObject = hookObject.context.wabe.config.schema?.classes?.find(
		(c) => c.name === hookObject.className,
	)?.permissions

	const acl = schemaPermissionsObject?.acl

	// Explicit opt-out: `acl: null` disables ACL (object governed by class-level permissions only).
	if (acl === null) return

	// Custom ACL function provided by the developer.
	if (typeof acl === 'function') {
		await acl(hookObject)
		return
	}

	// No ACL configured: secure-by-default. Scope to the creator when known.
	const ownerUserId =
		hookObject.className === 'User' ? hookObject.object?.id : hookObject.context.user?.id

	await applyDefaultOwnerAcl(hookObject, ownerUserId)
}

export const defaultSetupAclBeforeCreate = async (hookObject: HookObject<any, any>) => {
	// ACL on user need an update mutation not upsertNewData
	if (hookObject.className === 'User') return

	await setupAcl(hookObject)
}

export const defaultSetupAclOnUserAfterCreate = async (hookObject: HookObject<any, any>) =>
	setupAcl(hookObject)
