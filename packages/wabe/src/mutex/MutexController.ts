import type { DatabaseController } from '../database'
import type { WabeContext } from '../server/interface'
import type { Wabe, WabeTypes } from '../server'
import { contextWithRoot } from '../utils/export'
import { DevWabeTypes } from 'src/utils/helper'

export class MutexController<T extends WabeTypes> {
	private databaseController: DatabaseController<T>
	private rootContext: WabeContext<T>

	constructor(databaseController: DatabaseController<T>, wabe: Wabe<T>) {
		this.databaseController = databaseController
		this.rootContext = contextWithRoot({
			wabe,
		} as WabeContext<T>)
	}

	async lockMutex(name: string): Promise<boolean> {
		return this.databaseController.compareAndSetMutex({
			name,
			requiredLockedState: false,
			newLocked: true,
			context: this.rootContext,
		})
	}

	async unlockMutex(name: string): Promise<boolean> {
		return this.databaseController.compareAndSetMutex({
			name,
			requiredLockedState: true,
			newLocked: false,
			context: this.rootContext,
		})
	}

	async getMutexStatus(name: string): Promise<boolean> {
		const mutexes = await this.databaseController.getObjects({
			className: '_Mutex',
			// @ts-expect-error
			where: {
				name: { equalTo: name.trim() },
			},
			select: {
				// @ts-expect-error
				locked: true,
			},
			context: this.rootContext,
			first: 1,
		})

		return !!mutexes[0]?.locked
	}
}
