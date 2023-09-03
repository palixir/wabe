"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponseToUwsOpts = exports.getRequestFromUWSRequest = exports.isUWSResponse = void 0;
function isUWSResponse(res) {
    return !!res.onData;
}
exports.isUWSResponse = isUWSResponse;
function getRequestFromUWSRequest({ req, res, fetchAPI, signal }) {
    let body;
    const method = req.getMethod();
    if (method !== 'get' && method !== 'head') {
        body = new fetchAPI.ReadableStream({});
        const readable = body.readable;
        signal.addEventListener('abort', () => {
            readable.push(null);
        });
        res.onData(function (ab, isLast) {
            const chunk = Buffer.from(ab, 0, ab.byteLength);
            readable.push(Buffer.from(chunk));
            if (isLast) {
                readable.push(null);
            }
        });
    }
    const headers = new fetchAPI.Headers();
    req.forEach((key, value) => {
        headers.append(key, value);
    });
    let url = `http://localhost${req.getUrl()}`;
    const query = req.getQuery();
    if (query) {
        url += `?${query}`;
    }
    return new fetchAPI.Request(url, {
        method,
        headers,
        body: body,
        signal,
    });
}
exports.getRequestFromUWSRequest = getRequestFromUWSRequest;
async function forwardResponseBodyToUWSResponse(uwsResponse, fetchResponse, signal) {
    for await (const chunk of fetchResponse.body) {
        if (signal.aborted) {
            return;
        }
        uwsResponse.cork(() => {
            uwsResponse.write(chunk);
        });
    }
    uwsResponse.cork(() => {
        uwsResponse.end();
    });
}
function sendResponseToUwsOpts(uwsResponse, fetchResponse, signal) {
    if (!fetchResponse) {
        uwsResponse.writeStatus('404 Not Found');
        uwsResponse.end();
        return;
    }
    const bufferOfRes = fetchResponse._buffer;
    if (signal.aborted) {
        return;
    }
    uwsResponse.cork(() => {
        uwsResponse.writeStatus(`${fetchResponse.status} ${fetchResponse.statusText}`);
        for (const [key, value] of fetchResponse.headers) {
            // content-length causes an error with Node.js's fetch
            if (key !== 'content-length') {
                if (key === 'set-cookie') {
                    const setCookies = fetchResponse.headers.getSetCookie?.();
                    if (setCookies) {
                        for (const setCookie of setCookies) {
                            uwsResponse.writeHeader(key, setCookie);
                        }
                        continue;
                    }
                }
                uwsResponse.writeHeader(key, value);
            }
        }
        if (bufferOfRes) {
            uwsResponse.end(bufferOfRes);
        }
    });
    if (bufferOfRes) {
        return;
    }
    if (!fetchResponse.body) {
        uwsResponse.end();
        return;
    }
    return forwardResponseBodyToUWSResponse(uwsResponse, fetchResponse, signal);
}
exports.sendResponseToUwsOpts = sendResponseToUwsOpts;
