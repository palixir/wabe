"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PonyfillBody = void 0;
const tslib_1 = require("tslib");
const stream_1 = require("stream");
const busboy_1 = tslib_1.__importDefault(require("busboy"));
const Blob_js_1 = require("./Blob.js");
const File_js_1 = require("./File.js");
const FormData_js_1 = require("./FormData.js");
const ReadableStream_js_1 = require("./ReadableStream.js");
const utils_js_1 = require("./utils.js");
var BodyInitType;
(function (BodyInitType) {
    BodyInitType["ReadableStream"] = "ReadableStream";
    BodyInitType["Blob"] = "Blob";
    BodyInitType["FormData"] = "FormData";
    BodyInitType["String"] = "String";
    BodyInitType["Readable"] = "Readable";
    BodyInitType["Buffer"] = "Buffer";
})(BodyInitType || (BodyInitType = {}));
class PonyfillBody {
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
            return (0, utils_js_1.fakePromise)([]);
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
            return (0, utils_js_1.fakePromise)(this.bodyInit);
        }
        if (this._buffer) {
            const blob = new Blob_js_1.PonyfillBlob([this._buffer], {
                type: this.contentType || '',
                size: this.contentLength,
            });
            return (0, utils_js_1.fakePromise)(blob);
        }
        return this._collectChunksFromReadable().then(chunks => {
            return new Blob_js_1.PonyfillBlob(chunks, {
                type: this.contentType || '',
                size: this.contentLength,
            });
        });
    }
    formData(opts) {
        if (this.bodyType === BodyInitType.FormData) {
            return (0, utils_js_1.fakePromise)(this.bodyInit);
        }
        const formData = new FormData_js_1.PonyfillFormData();
        const _body = this.generateBody();
        if (_body == null) {
            return (0, utils_js_1.fakePromise)(formData);
        }
        const formDataLimits = {
            ...this.options.formDataLimits,
            ...opts?.formDataLimits,
        };
        return new Promise((resolve, reject) => {
            const bb = (0, busboy_1.default)({
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
                    const file = new File_js_1.PonyfillFile(chunks, filename, { type: mimeType });
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
            return (0, utils_js_1.fakePromise)(this._buffer);
        }
        if (this.bodyType === BodyInitType.Blob) {
            if (this.bodyInit instanceof Blob_js_1.PonyfillBlob) {
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
            return (0, utils_js_1.fakePromise)(this.bodyInit);
        }
        return this.arrayBuffer().then(buffer => buffer.toString('utf-8'));
    }
}
exports.PonyfillBody = PonyfillBody;
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
                const readable = stream_1.Readable.from(buffer);
                return new ReadableStream_js_1.PonyfillReadableStream(readable);
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
                const readable = stream_1.Readable.from(bodyInit);
                const body = new ReadableStream_js_1.PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if ((0, utils_js_1.isArrayBufferView)(bodyInit)) {
        const buffer = Buffer.from(bodyInit.buffer, bodyInit.byteOffset, bodyInit.byteLength);
        return {
            bodyType: BodyInitType.Buffer,
            contentLength: bodyInit.byteLength,
            contentType: null,
            buffer,
            bodyFactory() {
                const readable = stream_1.Readable.from(buffer);
                const body = new ReadableStream_js_1.PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if (bodyInit instanceof ReadableStream_js_1.PonyfillReadableStream && bodyInit.readable != null) {
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
                const readable = stream_1.Readable.from(buffer);
                const body = new ReadableStream_js_1.PonyfillReadableStream(readable);
                return body;
            },
        };
    }
    if (bodyInit instanceof stream_1.Readable) {
        return {
            bodyType: BodyInitType.Readable,
            contentType: null,
            contentLength: null,
            bodyFactory() {
                const body = new ReadableStream_js_1.PonyfillReadableStream(bodyInit);
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
                const body = new ReadableStream_js_1.PonyfillReadableStream(stream_1.Readable.from(bodyInit.toString()));
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
                return (0, FormData_js_1.getStreamFromFormData)(bodyInit, boundary);
            },
        };
    }
    if (isReadableStream(bodyInit)) {
        return {
            contentType: null,
            contentLength: null,
            bodyFactory() {
                return new ReadableStream_js_1.PonyfillReadableStream(bodyInit);
            },
        };
    }
    if (bodyInit[Symbol.iterator] || bodyInit[Symbol.asyncIterator]) {
        return {
            contentType: null,
            contentLength: null,
            bodyFactory() {
                const readable = stream_1.Readable.from(bodyInit);
                return new ReadableStream_js_1.PonyfillReadableStream(readable);
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
