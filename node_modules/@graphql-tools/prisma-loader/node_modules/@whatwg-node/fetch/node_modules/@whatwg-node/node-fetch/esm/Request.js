var _a;
import { PonyfillBody } from './Body.js';
import { isHeadersLike, PonyfillHeaders } from './Headers.js';
function isRequest(input) {
    return input[Symbol.toStringTag] === 'Request';
}
function isURL(obj) {
    return obj?.href != null;
}
export class PonyfillRequest extends PonyfillBody {
    constructor(input, options) {
        let url;
        let bodyInit = null;
        let requestInit;
        if (typeof input === 'string') {
            url = input;
        }
        else if (isURL(input)) {
            url = input.toString();
        }
        else if (isRequest(input)) {
            url = input.url;
            bodyInit = input.body;
            requestInit = input;
        }
        if (options != null) {
            bodyInit = options.body || null;
            requestInit = options;
        }
        super(bodyInit, options);
        this[_a] = 'Request';
        this.cache = requestInit?.cache || 'default';
        this.credentials = requestInit?.credentials || 'same-origin';
        this.headers =
            requestInit?.headers && isHeadersLike(requestInit.headers)
                ? requestInit.headers
                : new PonyfillHeaders(requestInit?.headers);
        this.integrity = requestInit?.integrity || '';
        this.keepalive = requestInit?.keepalive != null ? requestInit?.keepalive : false;
        this.method = requestInit?.method?.toUpperCase() || 'GET';
        this.mode = requestInit?.mode || 'cors';
        this.redirect = requestInit?.redirect || 'follow';
        this.referrer = requestInit?.referrer || 'about:client';
        this.referrerPolicy = requestInit?.referrerPolicy || 'no-referrer';
        this._signal = requestInit?.signal;
        this.headersSerializer = requestInit?.headersSerializer;
        this.duplex = requestInit?.duplex || 'half';
        this.url = url || '';
        this.destination = 'document';
        this.priority = 'auto';
        if (this.method !== 'GET' && this.method !== 'HEAD') {
            const contentTypeInHeaders = this.headers.get('content-type');
            if (!contentTypeInHeaders) {
                if (this.contentType) {
                    this.headers.set('content-type', this.contentType);
                }
            }
            else {
                this.contentType = contentTypeInHeaders;
            }
            const contentLengthInHeaders = this.headers.get('content-length');
            if (bodyInit == null && !contentLengthInHeaders) {
                this.contentLength = 0;
                this.headers.set('content-length', '0');
            }
            if (!contentLengthInHeaders) {
                if (this.contentLength) {
                    this.headers.set('content-length', this.contentLength.toString());
                }
            }
            else {
                this.contentLength = parseInt(contentLengthInHeaders, 10);
            }
        }
    }
    get signal() {
        // Create a new signal only if needed
        // Because the creation of signal is expensive
        if (!this._signal) {
            this._signal = new AbortController().signal;
        }
        return this._signal;
    }
    clone() {
        return new PonyfillRequest(this);
    }
}
_a = Symbol.toStringTag;
