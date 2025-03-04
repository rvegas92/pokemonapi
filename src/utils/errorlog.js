"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLog = void 0;
const fs_1 = __importDefault(require("fs"));
var ErrorLog;
(function (ErrorLog) {
    const filename = "error.log";
    function save(file, metodo, error) {
        fs_1.default.appendFile(filename, `[${file + ' : ' + currentLogDate()}] - [${metodo}'] => '${error}\n`, function () { });
    }
    ErrorLog.save = save;
    function info(file, mensaje) {
        fs_1.default.appendFile(filename, `[${file + ' : ' + currentLogDate()}] - [${mensaje}]\n`, function () { });
    }
    ErrorLog.info = info;
    function currentLogDate() {
        return new Date().toLocaleString();
    }
})(ErrorLog || (exports.ErrorLog = ErrorLog = {}));
