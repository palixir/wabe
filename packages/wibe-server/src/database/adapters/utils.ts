import { WibeSchemaTypes } from '../../../generated/wibe'
import { OperationType } from '../../hooks'
import { HookObject } from '../../hooks/HookObject'
import { WibeApp } from '../../server'

export const _findHooksAndExecute = async <
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
>({
	className,
	operationType,
	data,
	executionTime,
}: {
	className: T
	operationType: OperationType
	data: Record<K, WibeSchemaTypes[T][K]>
	executionTime?: number
}) => {
	const hooks =
		WibeApp.config.hooks?.filter(
			(hook) =>
				(hook.className === className &&
					hook.operationType === operationType) ||
				(!hook.className && hook.operationType === operationType),
		) || []

	await Promise.all(
		hooks.map((hook) =>
			hook.callback(
				new HookObject({
					className,
					data,
					executionTime,
				}),
			),
		),
	)
}
