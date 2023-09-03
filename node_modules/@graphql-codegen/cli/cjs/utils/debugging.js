"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetLogs = exports.printLogs = exports.debugLog = void 0;
const logger_js_1 = require("./logger.js");
let queue = [];
function debugLog(message, ...meta) {
    queue.push({
        message,
        meta,
    });
}
exports.debugLog = debugLog;
function printLogs() {
    for (const log of queue) {
        (0, logger_js_1.getLogger)().info(log.message, ...log.meta);
    }
    resetLogs();
}
exports.printLogs = printLogs;
function resetLogs() {
    queue = [];
}
exports.resetLogs = resetLogs;
