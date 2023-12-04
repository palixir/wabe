import { WibeTypes } from '../../../generated/wibe'
import { WhereType } from './adaptersInterface'

export const buildMongoWhereQuery = <T extends keyof WibeTypes>(
	where?: WhereType<T>,
): Record<string, any> => {
	if (!where) return {}

	const objectKeys = Object.keys(where) as Array<keyof WhereType<T>>

	return objectKeys.reduce((acc, key) => {
		const value = where[key]

		if (value?.equalTo) return { ...acc, [key]: value.equalTo }
		if (value?.notEqualTo)
			return { ...acc, [key]: { $ne: value.notEqualTo } }

		if (value?.greaterThan)
			return { ...acc, [key]: { $gt: value.greaterThan } }
		if (value?.greaterThanOrEqualTo)
			return {
				...acc,
				[key]: { $gte: value.greaterThanOrEqualTo },
			}

		if (value?.lessThan) return { ...acc, [key]: { $lt: value.lessThan } }
		if (value?.lessThanOrEqualTo)
			return { ...acc, [key]: { $lte: value.lessThanOrEqualTo } }

		if (value?.in) return { ...acc, [key]: { $in: value.in } }
		if (value?.notIn) return { ...acc, [key]: { $nin: value.notIn } }

		if (value && (key === 'OR' || key === 'AND')) {
			const objectKeys = Object.keys(value)

			const whereFromOrObject = buildMongoWhereQuery(value)
			const orObject = objectKeys.map((objectKey) => {
				return { [objectKey]: whereFromOrObject[objectKey] }
			})

			return { ...acc, [key === 'OR' ? '$or' : '$and']: orObject }
		}

		return { ...acc }
	}, {})
}
