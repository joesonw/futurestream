
interface Interface<I, O = I> {
    readonly isClosed: boolean;
    push(item: I): void;
    throw(err: Error): void;
    fetch(): Promise<O>;
    hasNext(): Promise<boolean>;
    close(): void;
}

export default Interface;
