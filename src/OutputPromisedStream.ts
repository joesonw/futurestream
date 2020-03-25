import * as Q from 'q';
import Interface from './Interface';

export default class OutputPromisedStream<I, O> implements Interface<I, O> {
    private next = Q.defer<boolean>();

    constructor(
        private input: Interface<I>,
        private promised: Promise<O>,
    ) {
        this.promised.then(() => this.next.resolve(true));
    }

    get isClosed(): boolean {
        return this.input.isClosed;
    }

    hasNext(): Promise<boolean> {
        return this.next.promise as any;
    }

    push(item: I) {
        this.input.push(item);
    }

    throw(err: Error) {
        this.input.throw(err);
    }

    fetch(): Promise<O> {
        return this.promised;
    }

    close() {
        this.input.close();
        this.next.resolve(false);
    }
}
