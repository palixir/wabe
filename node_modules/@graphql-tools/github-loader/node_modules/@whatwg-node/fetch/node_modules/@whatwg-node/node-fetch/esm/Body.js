import { Readable } from 'stream';
import busboy from 'busboy';
import { PonyfillBlob } from './Blob.js';
import { PonyfillFile } from './File.js';
import { getStreamFromFormData, PonyfillFormData } from './FormData.js';
import { PonyfillReadableStream } from './ReadableStream.js';
import { fakePromise, isArrayBufferView } from './utils.js';
var BodyInitType;
(function (BodyInitType) {
    BodyInitType["ReadableStream"] = "ReadableStream";
    BodyInitType["Blob"] = "Blob";
    BodyInitType["FormData"] = "FormData";
    BodyInitType["String"] = "String";
    BodyInitType["Readable"] = "Readable";
    BodyInitType["Buffer"] = "Buffer";
})(BodyInitType || (BodyInitType = {}));
export class PonyfillBody {
    constructor(bodyInit, options = {}) {
        this.bodyInit = bodyInit;
        this.options = options;
        this.bodyUsed = false;
        this.contentType = null;
        this.contentLength = null;
        this._bodyFactory = () => null;
        this._generatedBody = null;
        const { bodyFactory, contentType, contentLength, bodyType, buffer } = processBodyInit(bodyInit);
        this._bodyFactory = bodyFactory;
        this.contentType = contentType;
        this.contentLength = contentLength;
        this.bodyType = bodyType;
        this._buffer = buffer;
    }
    generateBody() {
        if (this._generatedBody) {
            return this._generatedBody;
        }
        const body = this._bodyFactory();
        this._generatedBody = body;
        return body;
    }
    get body() {
        const _body = this.generateBody();
        if (_body != null) {
            const ponyfillReadableStream = _body;
            const readable = _body.readable;
            return new Proxy(_body.readable, {
                get(_, prop) {
                    if (prop in ponyfillReadableStream) {
                        const ponyfillReadableStreamProp = ponyfillReadableStream[prop];
                        if (typeof ponyfillReadableStreamProp === 'function') {
                            return ponyfillReadableStreamProp.bind(ponyfillReadableStream);
                        }
                        return ponyfillReadableStreamProp;
                    }
                    if (prop in readable) {
                        const readableProp = readable[prop];
                        if (typeof readableProp === 'function') {
                            return readableProp.bind(readable);
                        }
                        return readableProp;
                    }
                },
            });
        }
        return null;
    }
    _collectChunksFromReadable() {
        const _body = this.generateBody();
        if (!_body) {
            return fakePromise([]);
        }
        const chunks = [];
        _body.readable.on('data', chunk => {
            chunks.push(chunk);
        });
        return new Promise((resolve, reject) => {
            _body.readable.once('end', () => {
                resolve(chunks);
            });
            _body.readable.once('error', e => {
                reject(e);
            });
        });
    }
    blob() {
        if (this.bodyType === BodyInitType.Blob) {
            return fakePromise(this.bodyInit);
        }
        if (this._buffer) {
            const blob = new PonyfillBlob([this._buffer], {
                type: this.contentType || '',
                size: this.contentLength,
            });
            return fakePromise(blob);
        }
        return this._collectChunksFromReadable().then(chunks => {
            return new PonyfillBlob(chunks, {
                type: this.contentType || '',
                size: this.contentLength,
            });
        });
    }
    formData(opts) {
        if (this.bodyType === BodyInitType.FormData) {
            return fakePromise(this.bodyInit);
        }
        const formData = new PonyfillFormData();
        const _body = this.generateBody();
        if (_body == null) {
            return fakePromise(formData);
        }
        const formDataLimits = {
            ...this.options.formDataLimits,
            ...opts?.formDataLimits,
        };
        return new Promise((resolve, reject) => {
            const bb = busboy({
                headers: {
                    'content-type': this.contentType || '',
                },
                limits: formDataLimits,
                defParamCharset: 'utf-8',
            });
            bb.on('field', (name, value, { nameTruncated, valueTruncated }) => {
                if (nameTruncated) {
                    reject(new Error(`Field name size exceeded: ${formDataLimits?.fieldNameSize} bytes`));
                }
                if (valueTruncated) {
                    reject(new Error(`Field value size exceeded: ${formDataLimits?.fieldSize} bytes`));
                }
                formData.set(name, value);
            });
            bb.on('fieldsLimit', () => {
                reject(new Error(`Fields limit exceeded: ${formDataLimits?.fields}`));
            });
            bb.on('file', (name, fileStream, { filename, mimeType }) => {
                const chunks = [];
                fileStream.on('limit', () => {
                    reject(new Error(`File size limit exceeded: ${formDataLimits?.fileSize} bytes`));
                });
                fileStream.on('data', chunk => {
                    chunks.push(chunk);
                });
                fileStream.on('close', () => {
                    if (fileStream.truncated) {
                        reject(new Error(`File size limit exceeded: ${formDataLimits?.fileSize} bytes`));
                    }
                    const file = new PonyfillFile(chunks, filename, { type: mimeType });
                    formData.set(name, file);
                });
            });
            bb.on('filesLimit', () => {
                reject(new Error(`Files limit exceeded: ${formDataLimits?.files}`));
            });
            bb.on('partsLimit', () => {
                reject(new Error(`Parts limit exceeded: ${formDataLimits?.parts}`));
            });
            bb.on('close', () => {
                resolve(formData);
            });
            bb.on('error', (err = 'An error occurred while parsing the form data') => {
                const errMessage = err.message || err.toString();
                reject(new TypeError(errMessage, err.cause));
            });
            _body?.readable.pipe(bb);
        });
    }
    arrayBuffer() {
        if (this._buffer) {
            return fakePromise(this._buffer);
        }
        if (this.bodyType === BodyInitType.Blob) {
            if (this.bodyInit instanceof PonyfillBlob) {
                return this.bodyInit.arrayBuffer();
            }
            const bodyInitTyped = this.bodyInit;
            return bodyInitTyped
                .arrayBuffer()
                .then(arrayBuffer => Buffer.from(arrayBuffer, undefined, bodyInitTyped.size));
        }
        return this._collectChunksFromReadable().then(function concatCollectedChunksFromReadable(chunks) {
            if (chunks.length === 1) {
                return chunks[0];
            }
            return Buffer.concat(chunks);
        });
    }
    json() {
        return this.text().then(function parseTextAsJson(text) {
            return JSON.parse(text);
        });
    }
    text() {
        if (this.bodyType === BodyInitType.String) {
            return fakePromise(this.bodyInit);
        }
        return this.arrayBuffer().then(buffer => buffer.toString('utf-8'));
    }
}
function processBodyInit(bodyInit) {
    if (bodyInit == null) {
        return {
            bodyFactory: () => null,
            contentType: null,
            contentLength: null,
        };
    }
    if (typeof bodyInit === 'string') {
        const buffer = Buffer.from(bodyInit);
        const contentLength = buffer.byteLength;
        return {
            bodyType: BodyInitType.String,
            contentType: 'text/plain;charset=UTF-8',
            contentLength,
            buffer,
            bodyFactory() {
                const readable = Readable.from(buffer);
                return new PonyfillReadableStream(readable);
            },
        };
    }
    if (Buffer.isBuffer(bodyInit)) {
        return {
            bodyType: BodyInitType.Buffer,
            contentType: null,
            contentLength: bodyInit.length,
            buffer: bodyInit,
            bodyFactory() {
                const readable = Readable.from(bodyInit);
                const body = new PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if (isArrayBufferView(bodyInit)) {
        const buffer = Buffer.from(bodyInit.buffer, bodyInit.byteOffset, bodyInit.byteLength);
        return {
            bodyType: BodyInitType.Buffer,
            contentLength: bodyInit.byteLength,
            contentType: null,
            buffer,
            bodyFactory() {
                const readable = Readable.from(buffer);
                const body = new PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if (bodyInit instanceof PonyfillReadableStream && bodyInit.readable != null) {
        return {
            bodyType: BodyInitType.ReadableStream,
            bodyFactory: () => bodyInit,
            contentType: null,
            contentLength: null,
        };
    }
    if (isBlob(bodyInit)) {
        return {
            bodyType: BodyInitType.Blob,
            contentType: bodyInit.type,
            contentLength: bodyInit.size,
            bodyFactory() {
                return bodyInit.stream();
            },
        };
    }
    if (bodyInit instanceof ArrayBuffer) {
        const contentLength = bodyInit.byteLength;
        const buffer = Buffer.from(bodyInit, undefined, bodyInit.byteLength);
        return {
            bodyType: BodyInitType.Buffer,
            contentType: null,
            contentLength,
            buffer,
            bodyFactory() {
                const readable = Readable.from(buffer);
                const body = new PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if (bodyInit instanceof Readable) {
        return {
            bodyType: BodyInitType.Readable,
            contentType: null,
            contentLength: null,
            bodyFactory() {
                const body = new PonyfillReadableStream(bodyInit);
                return body;
            },
        };
    }
    if (isURLSearchParams(bodyInit)) {
        const contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
        return {
            bodyType: BodyInitType.String,
            contentType,
            contentLength: null,
            bodyFactory() {
                const body = new PonyfillReadableStream(Readable.from(bodyInit.toString()));
                return body;
            },
        };
    }
    if (isFormData(bodyInit)) {
        const boundary = Math.random().toString(36).substr(2);
        const contentType = `multipart/form-data; boundary=${boundary}`;
        return {
            bodyType: BodyInitType.FormData,
            contentType,
            contentLength: null,
            bodyFactory() {
                return getStreamFromFormData(bodyInit, boundary);
            },
        };
    }
    if (isReadableStream(bodyInit)) {
        return {
            contentType: null,
            contentLength: null,
            bodyFactory() {
                return new PonyfillReadableStream(bodyInit);
            },
        };
    }
    if (bodyInit[Symbol.iterator] || bodyInit[Symbol.asyncIterator]) {
        return {
            contentType: null,
            contentLength: null,
            bodyFactory() {
                const readable = Readable.from(bodyInit);
                return new PonyfillReadableStream(readable);
            },
        };
    }
    throw new Error('Unknown body type');
}
function isFormData(value) {
    return value?.forEach != null;
}
function isBlob(value) {
    return value?.stream != null;
}
function isURLSearchParams(value) {
    return value?.sort != null;
}
function isReadableStream(value) {
    return value?.getReader != null;
}
