import { isArrayBufferView } from './utils.js';
export class PonyfillTextEncoder {
    constructor(encoding = 'utf-8') {
        this.encoding = encoding;
    }
    encode(input) {
        return Buffer.from(input, this.encoding);
    }
    encodeInto(source, destination) {
        const buffer = this.encode(source);
        const copied = buffer.copy(destination);
        return {
            read: copied,
            written: copied,
        };
    }
}
export class PonyfillTextDecoder {
    constructor(encoding = 'utf-8', options) {
        this.encoding = encoding;
        this.fatal = false;
        this.ignoreBOM = false;
        if (options) {
            this.fatal = options.fatal || false;
            this.ignoreBOM = options.ignoreBOM || false;
        }
    }
    decode(input) {
        if (Buffer.isBuffer(input)) {
            return input.toString(this.encoding);
        }
        if (isArrayBufferView(input)) {
            return Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString(this.encoding);
        }
        return Buffer.from(input).toString(this.encoding);
    }
}
export function PonyfillBtoa(input) {
    return Buffer.from(input, 'binary').toString('base64');
}
