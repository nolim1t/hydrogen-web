/*
Copyright 2025 New Vector Ltd.
Copyright 2020 Bruno Windels <bruno@windels.cloud>

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// we return undefined so you can reassign any member
// that uses `member?: T` syntax in one statement.
export type SubscriptionHandle = () => undefined;

export abstract class BaseObservable<T> {
    protected _handlers: Set<T> = new Set<T>();

    onSubscribeFirst(): void {

    }

    onUnsubscribeLast(): void {

    }

    subscribe(handler: T): SubscriptionHandle {
        this._handlers.add(handler);
        if (this._handlers.size === 1) {
            this.onSubscribeFirst();
        }
        return (): undefined => {
            return this.unsubscribe(handler);
        };
    }

    unsubscribe(handler?: T): undefined {
        if (handler) {
            this._handlers.delete(handler);
            if (this._handlers.size === 0) {
                this.onUnsubscribeLast();
            }
        }
        return undefined;
    }

    unsubscribeAll(): void {
        if (this._handlers.size !== 0) {
            this._handlers.clear();
            this.onUnsubscribeLast();
        }
    }

    get hasSubscriptions(): boolean {
        return this._handlers.size !== 0;
    }

    // Add iterator over handlers here
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function tests() {
    class Collection extends BaseObservable<{}> {
        firstSubscribeCalls: number = 0;
        firstUnsubscribeCalls: number = 0;

        onSubscribeFirst(): void { this.firstSubscribeCalls += 1; }
        onUnsubscribeLast(): void { this.firstUnsubscribeCalls += 1; }
    }

    return {
        test_unsubscribe(assert): void {
            const c = new Collection();
            const unsubscribe = c.subscribe({});
            unsubscribe();
            assert.equal(c.firstSubscribeCalls, 1);
            assert.equal(c.firstUnsubscribeCalls, 1);
        }
    };
}
