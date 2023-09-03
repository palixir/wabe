"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeReadable = exports.isArrayBufferView = exports.fakePromise = exports.defaultHeadersSerializer = exports.getHeadersObj = void 0;
function isHeadersInstance(obj) {
    return obj?.forEach != null;
}
function getHeadersObj(headers) {
    if (headers == null || !isHeadersInstance(headers)) {
        return headers;
    }
    const obj = {};
    headers.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
}
exports.getHeadersObj = getHeadersObj;
function defaultHeadersSerializer(headers, onContentLength) {
    const headerArray = [];
    headers.forEach((value, key) => {
        if (onContentLength && key === 'content-length') {
            onContentLength(value);
        }
        headerArray.push(`${key}: ${value}`);
    });
    return headerArray;
}
exports.defaultHeadersSerializer = defaultHeadersSerializer;
function isPromise(val) {
    return val?.then != null;
}
function fakePromise(value) {
    if (isPromise(value)) {
        return value;
    }
    // Write a fake promise to avoid the promise constructor
    // being called with `new Promise` in the browser.
    return {
        then(resolve) {
            if (resolve) {
                const callbackResult = resolve(value);
                if (isPromise(callbackResult)) {
                    return callbackResult;
                }
                return fakePromise(callbackResult);
            }
            return this;
        },
        catch() {
            return this;
        },
        finally(cb) {
            if (cb) {
                const callbackResult = cb();
                if (isPromise(callbackResult)) {
                    return callbackResult.then(() => value);
                }
                return fakePromise(value);
            }
            return this;
        },
        [Symbol.toStringTag]: 'Promise',
    };
}
exports.fakePromise = fakePromise;
function isArrayBufferView(obj) {
    return obj != null && obj.buffer != null && obj.byteLength != null && obj.byteOffset != null;
}
exports.isArrayBufferView = isArrayBufferView;
function isNodeReadable(obj) {
    return obj != null && obj.pipe != null;
}
exports.isNodeReadable = isNodeReadable;
