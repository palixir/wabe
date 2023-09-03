"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCurl = void 0;
const stream_1 = require("stream");
const Response_js_1 = require("./Response.js");
const utils_js_1 = require("./utils.js");
function fetchCurl(fetchRequest) {
    const { Curl, CurlFeature, CurlPause, CurlProgressFunc } = globalThis['libcurl'];
    const curlHandle = new Curl();
    curlHandle.enable(CurlFeature.NoDataParsing);
    curlHandle.setOpt('URL', fetchRequest.url);
    curlHandle.setOpt('SSL_VERIFYPEER', false);
    curlHandle.enable(CurlFeature.StreamResponse);
    curlHandle.setStreamProgressCallback(function () {
        return fetchRequest['_signal']?.aborted
            ? process.env.DEBUG
                ? CurlProgressFunc.Continue
                : 1
            : 0;
    });
    if (fetchRequest['bodyType'] === 'String') {
        curlHandle.setOpt('POSTFIELDS', fetchRequest['bodyInit']);
    }
    else {
        const nodeReadable = (fetchRequest.body != null
            ? (0, utils_js_1.isNodeReadable)(fetchRequest.body)
                ? fetchRequest.body
                : stream_1.Readable.from(fetchRequest.body)
            : null);
        if (nodeReadable) {
            curlHandle.setOpt('UPLOAD', true);
            curlHandle.setUploadStream(nodeReadable);
        }
    }
    if (process.env.DEBUG) {
        curlHandle.setOpt('VERBOSE', true);
    }
    curlHandle.setOpt('TRANSFER_ENCODING', false);
    curlHandle.setOpt('HTTP_TRANSFER_DECODING', true);
    curlHandle.setOpt('FOLLOWLOCATION', fetchRequest.redirect === 'follow');
    curlHandle.setOpt('MAXREDIRS', 20);
    curlHandle.setOpt('ACCEPT_ENCODING', '');
    curlHandle.setOpt('CUSTOMREQUEST', fetchRequest.method);
    const headersSerializer = fetchRequest.headersSerializer || utils_js_1.defaultHeadersSerializer;
    let size;
    const curlHeaders = headersSerializer(fetchRequest.headers, value => {
        size = Number(value);
    });
    if (size != null) {
        curlHandle.setOpt('INFILESIZE', size);
    }
    curlHandle.setOpt('HTTPHEADER', curlHeaders);
    curlHandle.enable(CurlFeature.NoHeaderParsing);
    return new Promise(function promiseResolver(resolve, reject) {
        let streamResolved;
        if (fetchRequest['_signal']) {
            fetchRequest['_signal'].onabort = () => {
                if (curlHandle.isOpen) {
                    try {
                        curlHandle.pause(CurlPause.Recv);
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            };
        }
        curlHandle.once('end', function endListener() {
            curlHandle.close();
        });
        curlHandle.once('error', function errorListener(error) {
            if (streamResolved && !streamResolved.closed && !streamResolved.destroyed) {
                streamResolved.destroy(error);
            }
            else {
                if (error.message === 'Operation was aborted by an application callback') {
                    error.message = 'The operation was aborted.';
                }
                reject(error);
            }
            curlHandle.close();
        });
        curlHandle.once('stream', function streamListener(stream, status, headersBuf) {
            const pipedStream = stream.pipe(new stream_1.PassThrough());
            const headersFlat = headersBuf
                .toString('utf8')
                .split(/\r?\n|\r/g)
                .filter(headerFilter => {
                if (headerFilter && !headerFilter.startsWith('HTTP/')) {
                    if (fetchRequest.redirect === 'error' &&
                        (headerFilter.includes('location') || headerFilter.includes('Location'))) {
                        pipedStream.destroy();
                        reject(new Error('redirect is not allowed'));
                    }
                    return true;
                }
                return false;
            });
            const headersInit = headersFlat.map(headerFlat => headerFlat.split(/:\s(.+)/).slice(0, 2));
            pipedStream.on('pause', () => {
                stream.pause();
            });
            pipedStream.on('resume', () => {
                stream.resume();
            });
            pipedStream.on('close', () => {
                stream.destroy();
            });
            const ponyfillResponse = new Response_js_1.PonyfillResponse(pipedStream, {
                status,
                headers: headersInit,
                url: fetchRequest.url,
            });
            resolve(ponyfillResponse);
            streamResolved = pipedStream;
        });
        curlHandle.perform();
    });
}
exports.fetchCurl = fetchCurl;
