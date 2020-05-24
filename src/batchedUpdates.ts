export type BatchedUpdater = (block: () => void) => void;

export const noOpBatchedUpdater: BatchedUpdater = (block: () => void) => block();

export function getBatchedUpdater(): BatchedUpdater {
	return batchedUpdater;
}

export function setBatchedUpdater(updater: BatchedUpdater) {
	batchedUpdater = updater;
}

let batchedUpdater = noOpBatchedUpdater;
