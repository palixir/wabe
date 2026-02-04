import type { HookObject } from './HookObject'
import type { WabeTypes } from '../server'
import { getNestedProperty, getNewObjectAfterUpdateNestedProperty } from '../utils'
import { OperationType } from '.'
import { hashArgon2, isArgon2Hash } from 'src/utils/crypto'

const hashField = ({ value }: { value: ReturnType<typeof HookObject.prototype.getNewData> }) => {
	if (!value || typeof value !== 'string' || isArgon2Hash(value)) return value

	return hashArgon2(value)
}

export async function hashFieldHook<T extends WabeTypes, K extends keyof WabeTypes['types']>(
	hookObject: HookObject<T, K>,
) {
	if (
		hookObject.operationType !== OperationType.BeforeCreate &&
		hookObject.operationType !== OperationType.BeforeUpdate
	)
		return

	const fields = hookObject.context.wabe.config.schema?.classes?.find(
		(cls: any) => cls.name === hookObject.className,
	)?.fields

	if (!fields) return

	const computeHashForFields = ({
		fieldsToCompute,
		path = '',
	}: {
		fieldsToCompute: typeof fields
		path?: string
	}) =>
		Promise.all(
			Object.entries(fieldsToCompute).map(async ([fieldName, fieldDef]) => {
				if (fieldDef.type === 'Object') {
					await computeHashForFields({
						// @ts-expect-error
						fieldsToCompute: fieldDef.object.fields,
						path: `${path || ''}${path ? '.' : ''}${fieldName}`,
					})

					return
				}

				if (fieldDef.type !== 'Hash') return

				// If we don't have nested object
				if (!path) {
					const hashed = await hashField({
						// @ts-expect-error
						value: hookObject.getNewData()[fieldName],
					})

					// @ts-expect-error
					hookObject.upsertNewData(fieldName, hashed)

					return
				}

				const objectNameToUpdate = path.split('.')[0] || ''
				// @ts-expect-error
				const objectToUpdate = hookObject.getNewData()[objectNameToUpdate]
				const valueToUpdate = getNestedProperty(hookObject.getNewData(), path)

				if (!valueToUpdate?.[fieldName]) return

				const hashed = await hashField({
					value: valueToUpdate[fieldName],
				})

				const newObject = getNewObjectAfterUpdateNestedProperty(
					{ [objectNameToUpdate]: objectToUpdate },
					`${path}.${fieldName}`,
					hashed,
				)

				if (hashed)
					hookObject.upsertNewData(
						// @ts-expect-error
						objectNameToUpdate,
						newObject[objectNameToUpdate],
					)
			}),
		)

	await computeHashForFields({ fieldsToCompute: fields })
}
