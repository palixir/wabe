import { notEmpty } from 'src'
import type { PointerPayloadObject, RelationPayloadObject } from './interface'

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const sanitizeIds = (values: unknown[]): string[] =>
	values.map((entry) => extractPointerId(entry)).filter(notEmpty)

export const extractPointerId = (value: unknown): string | undefined => {
	if (typeof value === 'string') return value
	if (!isRecord(value)) return undefined

	const id = value.id
	return typeof id === 'string' ? id : undefined
}

export const toPointerPayloadObject = (className: string, id: string): PointerPayloadObject => ({
	class: className,
	id,
	type: 'Pointer',
})

export const toRelationPayloadObject = (
	className: string,
	ids: string[],
): RelationPayloadObject => ({
	class: className,
	ids,
	type: 'Relation',
})

export const isRelationPayloadObject = (value: unknown): value is RelationPayloadObject =>
	isRecord(value) && value.type === 'Relation' && Array.isArray(value.ids)

export const extractRelationIds = (value: unknown): string[] =>
	Array.isArray(value)
		? sanitizeIds(value)
		: isRelationPayloadObject(value)
			? sanitizeIds(value.ids)
			: []

export const normalizePointerValue = (value: unknown, targetClass: string): unknown => {
	if (value == null) return value
	const pointerId = extractPointerId(value)
	return pointerId ? toPointerPayloadObject(targetClass, pointerId) : value
}

export const normalizeRelationValue = (value: unknown, targetClass: string): unknown => {
	if (value == null) return value
	if (!Array.isArray(value) && !isRelationPayloadObject(value)) return value

	return toRelationPayloadObject(targetClass, extractRelationIds(value))
}
