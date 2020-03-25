import Interface from './Interface';

export default class ReadOnlyStream<I> implements Interface<I> {
    constructor(
        private input: Interface<I>,
    ) {
    }

    get isClosed(): boolean {
        return this.input.isClosed;
    }

    hasNext(): Promise<boolean> {
        return this.input.hasNext();
    }

    push(item: I) {
    }

    throw(err: Error) {
    }

    fetch(): Promise<I> {
        return this.input.fetch();
    }

    close() {
        this.input.close();
    }
}
