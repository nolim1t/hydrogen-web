import { SortedArray, MappedList, ConcatList } from "../../../observable/index.js";
import Direction from "./Direction.js";
import GapWriter from "./persistence/GapWriter.js";
import TimelineReader from "./persistence/TimelineReader.js";
import PendingEventEntry from "./entries/PendingEventEntry.js";

export default class Timeline {
    constructor({roomId, storage, closeCallback, fragmentIdComparer, pendingEvents, user, hsApi}) {
        this._roomId = roomId;
        this._storage = storage;
        this._closeCallback = closeCallback;
        this._fragmentIdComparer = fragmentIdComparer;
        this._hsApi = hsApi;
        this._remoteEntries = new SortedArray((a, b) => a.compare(b));
        this._timelineReader = new TimelineReader({
            roomId: this._roomId,
            storage: this._storage,
            fragmentIdComparer: this._fragmentIdComparer
        });
        const localEntries = new MappedList(pendingEvents, pe => {
            return new PendingEventEntry({pendingEvent: pe, user});
        }, (pee, params) => {
            pee.notifyUpdate(params);
        });
        this._allEntries = new ConcatList(this._remoteEntries, localEntries);
    }

    /** @package */
    async load() {
        const entries = await this._timelineReader.readFromEnd(50);
        this._remoteEntries.setManySorted(entries);
    }

    /** @package */
    appendLiveEntries(newEntries) {
        this._remoteEntries.setManySorted(newEntries);
    }

    /** @public */
    async fillGap(fragmentEntry, amount) {
        const response = await this._hsApi.messages(this._roomId, {
            from: fragmentEntry.token,
            dir: fragmentEntry.direction.asApiString(),
            limit: amount,
            filter: {lazy_load_members: true}
        }).response();
        const gapWriter = new GapWriter({
            roomId: this._roomId,
            storage: this._storage,
            fragmentIdComparer: this._fragmentIdComparer
        });
        const newEntries = await gapWriter.writeFragmentFill(fragmentEntry, response);
        this._remoteEntries.setManySorted(newEntries);
    }

    // tries to prepend `amount` entries to the `entries` list.
    async loadAtTop(amount) {
        const firstEventEntry = this._remoteEntries.array.find(e => !!e.eventType);
        if (!firstEventEntry) {
            return;
        }
        const entries = await this._timelineReader.readFrom(
            firstEventEntry.asEventKey(),
            Direction.Backward,
            amount
        );
        this._remoteEntries.setManySorted(entries);
    }

    /** @public */
    get entries() {
        return this._allEntries;
    }

    /** @public */
    close() {
        this._closeCallback();
    }
}