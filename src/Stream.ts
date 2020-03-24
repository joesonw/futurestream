import * as Q from 'q';

export default class Stream<T> {
    private items: T[] = [];
    private waitingList: Q.Deferred<T>[] = [];
    private _isClosed = false; 
    private errorList: Error[] = [];
    private nextList: Q.Deferred<boolean>[] = [];

    constructor(private onClose: Function) {
    }

    get isClosed(): boolean {
        return this._isClosed;
    }

    static from<I, O>(input: Stream<I>, encode: (data: I) => O): Stream<O> {
        const output = new Stream<O>(() => {});
        (async () => {
            while (input.hasNext()) {
                try {
                    const item = await input.fetch();
                    output.push(encode(item));
                } catch (err) {
                    output.reject(err);
                }
            }
        })();

        return output;
    }

    to<O>(decode: (data: T) => O): Stream<O> {
        return Stream.from(this, decode);
    }

    push(item: T) {
        if (this._isClosed) {
            throw new Error('stream is closed');
        }

        const d = this.waitingList.shift();
        if (!d) {
            this.items.push(item);
        } else {
            d.resolve(item);
        }
        this.resolveNext(true);
    }

    fetch(): Promise<T> {
        if (this._isClosed) {
            throw new Error('stream is closed');
        }

        if (this.errorList.length) {
            return Promise.reject(this.errorList.shift());
        }

        if (this.items.length) {
            return Promise.resolve(this.items.shift());
        }
        const d = Q.defer<T>();
        this.waitingList.push(d);
        return d.promise as any;
    }

    hasNext(): PromiseLike<boolean> {
        const d = Q.defer<boolean>();
        this.nextList.push(d);
        return d.promise;
    }

    private resolveNext(next: boolean) {
        const nexts = this.nextList.splice(0, this.nextList.length);
        for (const d of nexts) {
            d.resolve(next);
        }
    }

    close() {
        if (this._isClosed) return;
        this.resolveNext(false);
        this._isClosed = true;
        this.onClose();
        for (const d of this.waitingList) {
            d.reject(new Error('stream is closed'));
        }
    }

    reject(err: Error) {
        if (this._isClosed) {
            throw new Error('stream is closed');
        }

        const d = this.waitingList.shift();
        if (!d) {
            this.errorList.push(err);
        } else {
            d.reject(err);
        }
    }
}
