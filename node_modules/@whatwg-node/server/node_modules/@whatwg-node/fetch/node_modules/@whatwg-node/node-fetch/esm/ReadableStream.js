import { Readable } from 'stream';
function createController(desiredSize, readable) {
    let chunks = [];
    let _closed = false;
    let flushed = false;
    return {
        desiredSize,
        enqueue(chunk) {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            if (!flushed) {
                chunks.push(buf);
            }
            else {
                readable.push(buf);
            }
        },
        close() {
            if (chunks.length > 0) {
                this._flush();
            }
            readable.push(null);
            _closed = true;
        },
        error(error) {
            if (chunks.length > 0) {
                this._flush();
            }
            readable.destroy(error);
        },
        get _closed() {
            return _closed;
        },
        _flush() {
            flushed = true;
            if (chunks.length > 0) {
                const concatenated = chunks.length > 1 ? Buffer.concat(chunks) : chunks[0];
                readable.push(concatenated);
                chunks = [];
            }
        },
    };
}
function isNodeReadable(obj) {
    return obj?.read != null;
}
function isReadableStream(obj) {
    return obj?.getReader != null;
}
export class PonyfillReadableStream {
    constructor(underlyingSource) {
        this.locked = false;
        if (underlyingSource instanceof PonyfillReadableStream && underlyingSource.readable != null) {
            this.readable = underlyingSource.readable;
        }
        else if (isNodeReadable(underlyingSource)) {
            this.readable = underlyingSource;
        }
        else if (isReadableStream(underlyingSource)) {
            let reader;
            let started = false;
            this.readable = new Readable({
                read() {
                    if (!started) {
                        started = true;
                        reader = underlyingSource.getReader();
                    }
                    reader
                        .read()
                        .then(({ value, done }) => {
                        if (done) {
                            this.push(null);
                        }
                        else {
                            this.push(value);
                        }
                    })
                        .catch(err => {
                        this.destroy(err);
                    });
                },
                destroy(err, callback) {
                    reader.cancel(err).then(() => callback(err), callback);
                },
            });
        }
        else {
            let started = false;
            let ongoing = false;
            this.readable = new Readable({
                read(desiredSize) {
                    if (ongoing) {
                        return;
                    }
                    ongoing = true;
                    return Promise.resolve().then(async () => {
                        if (!started) {
                            const controller = createController(desiredSize, this);
                            started = true;
                            await underlyingSource?.start?.(controller);
                            controller._flush();
                            if (controller._closed) {
                                return;
                            }
                        }
                        const controller = createController(desiredSize, this);
                        await underlyingSource?.pull?.(controller);
                        controller._flush();
                        ongoing = false;
                    });
                },
                async destroy(err, callback) {
                    try {
                        await underlyingSource?.cancel?.(err);
                        callback(null);
                    }
                    catch (err) {
                        callback(err);
                    }
                },
            });
        }
    }
    cancel(reason) {
        this.readable.destroy(reason);
        return Promise.resolve();
    }
    getReader(_options) {
        const iterator = this.readable[Symbol.asyncIterator]();
        this.locked = true;
        return {
            read() {
                return iterator.next();
            },
            releaseLock: () => {
                iterator.return?.();
                this.locked = false;
            },
            cancel: async (reason) => {
                await iterator.return?.(reason);
                this.locked = false;
            },
            closed: new Promise((resolve, reject) => {
                this.readable.once('end', resolve);
                this.readable.once('error', reject);
            }),
        };
    }
    [Symbol.asyncIterator]() {
        return this.readable[Symbol.asyncIterator]();
    }
    tee() {
        throw new Error('Not implemented');
    }
    async pipeTo(destination) {
        const writer = destination.getWriter();
        await writer.ready;
        for await (const chunk of this.readable) {
            await writer.write(chunk);
        }
        await writer.ready;
        return writer.close();
    }
    pipeThrough({ writable, readable, }) {
        this.pipeTo(writable);
        return readable;
    }
    static [Symbol.hasInstance](instance) {
        return isReadableStream(instance);
    }
}
