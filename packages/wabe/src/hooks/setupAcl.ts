import type { HookObject } from './HookObject'

const setupAcl = async (hookObject: HookObject<any, any>) => {
	const schemaPermissionsObject = hookObject.context.wabe.config.schema?.classes?.find(
		(c) => c.name === hookObject.className,
	)?.permissions

	if (!schemaPermissionsObject) return

	const { acl } = schemaPermissionsObject

	if (hookObject.isFieldUpdated('acl') || !acl) return

	if (acl) await acl(hookObject)
}

export const defaultSetupAclBeforeCreate = async (hookObject: HookObject<any, any>) => {
	// ACL on user need an update mutation not upsertNewData
	if (hookObject.className === 'User') return

	await setupAcl(hookObject)
}

export const defaultSetupAclOnUserAfterCreate = async (hookObject: HookObject<any, any>) =>
	setupAcl(hookObject)
