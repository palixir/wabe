"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGETRequest = exports.isGETRequest = void 0;
const fetch_1 = require("@whatwg-node/fetch");
const utils_js_1 = require("./utils.js");
function isGETRequest(request) {
    return request.method === 'GET';
}
exports.isGETRequest = isGETRequest;
function parseGETRequest(request) {
    const [, queryString = ''] = request.url.split('?');
    const searchParams = new fetch_1.URLSearchParams(queryString);
    return (0, utils_js_1.handleURLSearchParams)(searchParams);
}
exports.parseGETRequest = parseGETRequest;
