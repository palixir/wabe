import type { GraphQLResolveInfo } from 'graphql'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { contextWithRoot } from '../../utils/export'
import { getRequestedUserSelect } from '../../graphql/resolvers'
import { assertCanReadSelect } from '../../hooks/protected'

export const meResolver = async (
	_: any,
	__: any,
	context: WabeContext<DevWabeTypes>,
	info?: GraphQLResolveInfo,
) => {
	if (!context.user?.id) return { user: undefined }

	const select = getRequestedUserSelect(info) ?? { id: true }

	const userSchemaClass = context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === 'User',
	)

	// A user can always read their own object (we bypass CLP below with a root context),
	// but field-level protections still apply: deny access to protected fields the caller
	// is not authorized to read (password hash, SRP secrets, otpSalt, ...).
	assertCanReadSelect({
		select,
		fields: userSchemaClass?.fields,
		context: { isRoot: false, user: context.user },
	})

	const user = await context.wabe.controllers.database.getObject({
		className: 'User',
		id: context.user.id,
		select,
		context: contextWithRoot(context),
	})

	return { user }
}
