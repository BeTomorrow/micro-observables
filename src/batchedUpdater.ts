export type BatchedUpdater = (block: () => void) => void;

export let batchedUpdater: BatchedUpdater | undefined;

export function setBatchedUpdater(updater: BatchedUpdater | undefined) {
  batchedUpdater = updater;
}
