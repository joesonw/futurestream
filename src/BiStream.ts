import Stream from './Stream';

export default class BiStream<I, O> {
    constructor(
        private input: Stream<I>,
        private output: Stream<O>,
    ) {
    }

    get isClosed(): boolean {
        return this.output.isClosed;
    }

    push(item: I) {
        this.input.push(item);
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

    reject(err: Error) {
        this.input.reject(err);
    }
}