"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNodeHttp = void 0;
const http_1 = require("http");
const https_1 = require("https");
const stream_1 = require("stream");
const zlib_1 = require("zlib");
const AbortError_js_1 = require("./AbortError.js");
const Request_js_1 = require("./Request.js");
const Response_js_1 = require("./Response.js");
const URL_js_1 = require("./URL.js");
const utils_js_1 = require("./utils.js");
function getRequestFnForProtocol(url) {
    if (url.startsWith('http:')) {
        return http_1.request;
    }
    else if (url.startsWith('https:')) {
        return https_1.request;
    }
    throw new Error(`Unsupported protocol: ${url.split(':')[0] || url}`);
}
function fetchNodeHttp(fetchRequest) {
    return new Promise((resolve, reject) => {
        try {
            const requestFn = getRequestFnForProtocol(fetchRequest.url);
            const nodeReadable = (fetchRequest.body != null
                ? (0, utils_js_1.isNodeReadable)(fetchRequest.body)
                    ? fetchRequest.body
                    : stream_1.Readable.from(fetchRequest.body)
                : null);
            const headersSerializer = fetchRequest.headersSerializer || utils_js_1.getHeadersObj;
            const nodeHeaders = headersSerializer(fetchRequest.headers);
            const nodeRequest = requestFn(fetchRequest.url, {
                method: fetchRequest.method,
                headers: nodeHeaders,
                signal: fetchRequest['_signal'] ?? undefined,
                agent: fetchRequest.agent,
            });
            nodeRequest.once('response', nodeResponse => {
                let responseBody = nodeResponse;
                const contentEncoding = nodeResponse.headers['content-encoding'];
                switch (contentEncoding) {
                    case 'x-gzip':
                    case 'gzip':
                        responseBody = nodeResponse.pipe((0, zlib_1.createGunzip)());
                        break;
                    case 'x-deflate':
                    case 'deflate':
                        responseBody = nodeResponse.pipe((0, zlib_1.createInflate)());
                        break;
                    case 'br':
                        responseBody = nodeResponse.pipe((0, zlib_1.createBrotliDecompress)());
                        break;
                }
                if (nodeResponse.headers.location) {
                    if (fetchRequest.redirect === 'error') {
                        const redirectError = new Error('Redirects are not allowed');
                        reject(redirectError);
                        nodeResponse.resume();
                        return;
                    }
                    if (fetchRequest.redirect === 'follow') {
                        const redirectedUrl = new URL_js_1.PonyfillURL(nodeResponse.headers.location, fetchRequest.url);
                        const redirectResponse$ = fetchNodeHttp(new Request_js_1.PonyfillRequest(redirectedUrl, fetchRequest));
                        resolve(redirectResponse$.then(redirectResponse => {
                            redirectResponse.redirected = true;
                            return redirectResponse;
                        }));
                        nodeResponse.resume();
                        return;
                    }
                }
                if (responseBody === nodeResponse) {
                    responseBody = nodeResponse.pipe(new stream_1.PassThrough());
                    responseBody.on('pause', () => {
                        nodeResponse.pause();
                    });
                    responseBody.on('resume', () => {
                        nodeResponse.resume();
                    });
                    responseBody.on('close', () => {
                        nodeResponse.destroy();
                    });
                    fetchRequest['_signal']?.addEventListener('abort', () => {
                        if (!nodeResponse.destroyed) {
                            responseBody.emit('error', new AbortError_js_1.PonyfillAbortError());
                        }
                    });
                }
                nodeResponse.once('error', reject);
                const ponyfillResponse = new Response_js_1.PonyfillResponse(responseBody, {
                    status: nodeResponse.statusCode,
                    statusText: nodeResponse.statusMessage,
                    headers: nodeResponse.headers,
                    url: fetchRequest.url,
                });
                resolve(ponyfillResponse);
            });
            nodeRequest.once('error', reject);
            if (nodeReadable) {
                nodeReadable.pipe(nodeRequest);
            }
            else {
                nodeRequest.end();
            }
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.fetchNodeHttp = fetchNodeHttp;
