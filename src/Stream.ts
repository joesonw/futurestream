import * as Q from 'q';
import Interface from './Interface';
import ReadOnlyStream from './ReadOnlyStream'; 

export default class Stream<T> implements Interface<T> {
    private items: T[] = [];
    private waitingList: Q.Deferred<T>[] = [];
    private _isClosed = false; 
    private errorList: Error[] = [];
    private nextList: Q.Deferred<boolean>[] = [];
    private tapped: Interface<T>[] = [];

    constructor(private onCloseFunction: Function) {
    }

    get isClosed(): boolean {
        return this._isClosed;
    }

    static fromPromise<T>(promise: PromiseLike<T>): Stream<T> {
        const stream = new Stream<T>(() => {});
        (async () => {
            try {
                const res = await promise;
                stream.push(res);
            } catch (err) {
                stream.throw(err);
            } finally {
                stream.close();
            }
        })();
        
        return stream;
    }

    static from<I, O>(input: Interface<I>, encode: (data: I) => O): Stream<O> {
        const output = new Stream<O>(() => {});
        (async () => {
            while (await input.hasNext()) {
                try {
                    const item = await input.fetch();
                    output.push(encode(item));
                } catch (err) {
                    output.throw(err);
                }
            }
            output.close();
        })();

        return output;
    }

    to<O>(decode: (data: T) => O): Stream<O> {
        return Stream.from(this, decode);
    }

    readOnly(): Interface<T> {
        return new ReadOnlyStream(this);
    }

    tap(): Stream<T> {
        const newStream = new Stream<T>(() => {
            const index = this.tapped.indexOf(newStream);
            if (index >= 0) {
                this.tapped.splice(index);
            }
        });
        this.tapped.push(newStream);
        return newStream;
    }

    mirror(stream: Stream<T>) {
        stream.tapped.push(stream)
        this.onClose(() => {
            const index = stream.tapped.indexOf(this);
            if (index >= 0) {
                stream.tapped.splice(index);
            }
        });
    }

    onClose(onCloseFunction: Function): this {
        const originalOnCloseFunction = this.onCloseFunction;
        this.onCloseFunction = () => {
            originalOnCloseFunction();
            onCloseFunction();
        };
        return this;
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

        for (const tap of this.tapped) {
            tap.push(item);
        }
    }

    throw(err: Error) {
        if (this._isClosed) {
            throw new Error('stream is closed');
        }

        const d = this.waitingList.shift();
        if (!d) {
            this.errorList.push(err);
        } else {
            d.reject(err);
        }

        for (const tap of this.tapped) {
            tap.throw(err);
        }
    }

    fetch(): Promise<T> {
        if (this.items.length) {
            return Promise.resolve(this.items.shift());
        }

        if (this._isClosed) {
           return Promise.reject(new Error('stream is closed'));
        }

        if (this.errorList.length) {
            return Promise.reject(this.errorList.shift());
        }

        const d = Q.defer<T>();
        this.waitingList.push(d);
        return d.promise as any;
    }

    hasNext(): Promise<boolean> {
        if (this.items.length) {
            return Promise.resolve(true);
        }

        if (this._isClosed) {
            return Promise.resolve(false);
        }
        
        const d = Q.defer<boolean>();
        this.nextList.push(d);
        return d.promise as any;
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
        this.onCloseFunction();
        for (const d of this.waitingList) {
            d.reject(new Error('stream is closed'));
        }
        for (const tap of this.tapped) {
            tap.close();
        }
    }
}
