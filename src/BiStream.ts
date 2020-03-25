import Interface from './Interface';

export default class BiStream<I, O> implements Interface<I, O> {
    constructor(
        private input: Interface<I>,
        private output: Interface<O>,
    ) {
    }

    get isClosed(): boolean {
        return this.output.isClosed;
    }

    push(item: I) {
        this.input.push(item);
    }

    throw(err: Error) {
        this.input.throw(err);
    }

    fetch() {
        return this.output.fetch();
    }

    hasNext() {
        return this.output.hasNext();
    }

    close() {
        this.output.close();
    }
}