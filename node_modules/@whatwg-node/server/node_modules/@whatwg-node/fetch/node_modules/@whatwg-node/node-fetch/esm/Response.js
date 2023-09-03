import { STATUS_CODES } from 'http';
import { PonyfillBody } from './Body.js';
import { isHeadersLike, PonyfillHeaders } from './Headers.js';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
export class PonyfillResponse extends PonyfillBody {
    constructor(body, init) {
        super(body || null, init);
        this.headers =
            init?.headers && isHeadersLike(init.headers)
                ? init.headers
                : new PonyfillHeaders(init?.headers);
        this.status = init?.status || 200;
        this.statusText = init?.statusText || STATUS_CODES[this.status] || 'OK';
        this.url = init?.url || '';
        this.redirected = init?.redirected || false;
        this.type = init?.type || 'default';
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
        if (!contentLengthInHeaders) {
            if (this.contentLength) {
                this.headers.set('content-length', this.contentLength.toString());
            }
        }
        else {
            this.contentLength = parseInt(contentLengthInHeaders, 10);
        }
    }
    get ok() {
        return this.status >= 200 && this.status < 300;
    }
    clone() {
        return new PonyfillResponse(this.body, this);
    }
    static error() {
        return new PonyfillResponse(null, {
            status: 500,
            statusText: 'Internal Server Error',
        });
    }
    static redirect(url, status = 301) {
        if (status < 300 || status > 399) {
            throw new RangeError('Invalid status code');
        }
        return new PonyfillResponse(null, {
            headers: {
                location: url,
            },
            status,
        });
    }
    static json(data, init = {}) {
        init.headers =
            init?.headers && isHeadersLike(init.headers)
                ? init.headers
                : new PonyfillHeaders(init?.headers);
        if (!init.headers.has('content-type')) {
            init.headers.set('content-type', JSON_CONTENT_TYPE);
        }
        return new PonyfillResponse(JSON.stringify(data), init);
    }
}
