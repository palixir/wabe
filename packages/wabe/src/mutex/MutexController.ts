import type { DatabaseController } from '../database'
import type { WabeContext } from '../server/interface'
import type { Wabe, WabeTypes } from '../server'
import { contextWithRoot } from '../utils/export'

// A lock held longer than this is considered stale (its owner most likely crashed before
// releasing it) and can be stolen by the next acquirer, so that a hard process crash cannot
// leave a mutex locked forever.
const DEFAULT_STALE_LOCK_MS = 30_000

export class MutexController<T extends WabeTypes> {
	private databaseController: DatabaseController<T>
	private rootContext: WabeContext<T>

	constructor(databaseController: DatabaseController<T>, wabe: Wabe<T>) {
		this.databaseController = databaseController
		this.rootContext = contextWithRoot({
			wabe,
		} as WabeContext<T>)
	}

	async lockMutex(name: string, { staleLockMs = DEFAULT_STALE_LOCK_MS } = {}): Promise<boolean> {
		return this.databaseController.compareAndSetMutex({
			name,
			requiredLockedState: false,
			newLocked: true,
			context: this.rootContext,
			staleLockMs,
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
