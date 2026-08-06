import { setMaxListeners } from 'events'

/** Agent/tool/LLM nodes each attach abort listeners to one shared signal; default Node limit is 10. */
const ABORT_SIGNAL_MAX_LISTENERS = 100

/**
 * This pool is to keep track of abort controllers mapped to chatflowid_chatid
 */
export class AbortControllerPool {
    abortControllers: Record<string, AbortController> = {}

    /**
     * Add to the pool
     * @param {string} id
     * @param {AbortController} abortController
     */
    add(id: string, abortController: AbortController) {
        setMaxListeners(ABORT_SIGNAL_MAX_LISTENERS, abortController.signal)
        this.abortControllers[id] = abortController
    }

    /**
     * Remove from the pool
     * @param {string} id
     */
    remove(id: string) {
        if (Object.prototype.hasOwnProperty.call(this.abortControllers, id)) {
            delete this.abortControllers[id]
        }
    }

    /**
     * Get the abort controller
     * @param {string} id
     */
    get(id: string) {
        return this.abortControllers[id]
    }

    /**
     * Abort
     * @param {string} id
     */
    abort(id: string) {
        const abortController = this.abortControllers[id]
        if (abortController) {
            abortController.abort()
            this.remove(id)
        }
    }
}
