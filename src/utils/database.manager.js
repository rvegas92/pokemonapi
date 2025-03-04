"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = void 0;
const lodash_1 = __importDefault(require("lodash"));
const fs = __importStar(require("fs"));
// const fs = require('fs');
const mssql_1 = __importDefault(require("mssql"));
const errorlog_1 = require("./errorlog");
var DataBase;
(function (DataBase) {
    const errorQueue = [];
    async function connect(settings, fnCallback) {
        try {
            DataBase.pool = await new mssql_1.default.ConnectionPool(settings).connect();
            fnCallback && fnCallback();
        }
        catch (error) {
            errorlog_1.ErrorLog.save('database.manager.ts', 'connect()', error.message);
        }
    }
    DataBase.connect = connect;
    function getObjects(obj, data) {
        typeof obj != "object" && (obj = lodash_1.default.reduce(lodash_1.default.split(obj, ','), (a, b) => Object.assign(a, { [b]: 1 }), {}));
        return data ? (lodash_1.default.reduce(lodash_1.default.keys(obj), (a, b) => Object.assign(a, data[b] ? { [b]: data[b] } : {}), {})) : obj;
    }
    function setTypeDate(data) {
        if (typeof data == 'string') {
            return data.startsWith('sql') ? data.replace('sql', '') : "'" + data + "'";
        }
        return data == null || data == undefined ? 'NULL' : data;
    }
    function getProps(query) {
        let { recordset, output, rowsAffected, recordsets } = query;
        return { row: lodash_1.default.first(recordset), rows: recordset, out: output,
            rowsAffected: lodash_1.default.reduce(rowsAffected, (a, b) => a + b, 0), recordsets };
    }
    function setFields(data) {
        return lodash_1.default.reduce(lodash_1.default.keys(data), (a, b) => {
            let val = data[b];
            let simb = (val && typeof val == 'object' && 'add' in val ? '+' : val && typeof val == 'object' && 'sub' in val ? '-' : '') + "=";
            val = val && typeof val == 'object' ? val['add'] || val['sub'] : val;
            return a + b + simb + (setTypeDate(val)) + ",";
        }, "").slice(0, -1);
    }
    function fields(data) {
        return lodash_1.default.join(lodash_1.default.keys(getObjects(data)), ',');
    }
    function parseWhere(key, val) {
        if (val && typeof val == 'object' && 'today' in val) {
            val = 'convert(char(8), ' + key + ', 112)';
            key = 'convert(char(8), getDate(), 112)';
        }
        else
            val = setTypeDate(val);
        return key + '=' + val; //
    }
    function where(data) {
        return typeof data == 'string' ? data : lodash_1.default.reduce(lodash_1.default.keys(data), (a, b, i) => {
            return a + (i != 0 ? (b.startsWith('_') ? ' or ' : ' and ') : '') + parseWhere(b.startsWith('_') ? b.replace('_', '') : b, data[b]);
        }, "");
    }
    function remplaceWhere(_where, table, _fields) {
        function _replace(str) {
            str = str.replace(/\$t([0-9]+)?/g, table);
            str = str.replace(/\$f([0-9]+)?/g, (a, b) => lodash_1.default.keys(_fields)[b || 0]);
            str = str.replace(/\$w([0-9]+)?/g, (a, b) => lodash_1.default.keys(_where)[b || 0]);
            return str;
        }
        return typeof _where == 'string' ? _replace(_where) : lodash_1.default.reduce(lodash_1.default.keys(_where), (a, b) => {
            return Object.assign(a, { [b]: typeof _where[b] == 'string' ? _replace(_where[b]) : _where[b] });
        }, {});
    }
    function trimChars(obj, trim = false) {
        if (!trim)
            return obj;
        let isSingle = !Array.isArray(obj);
        !isSingle || (obj = [obj]);
        obj = lodash_1.default.map(obj, (e) => {
            for (let key in e) {
                if (e && typeof e[key] == 'string') {
                    e[key] = e[key].trim();
                }
            }
            return e;
        });
        return isSingle ? lodash_1.default.first(obj) : obj;
    }
    async function query(q, _trimChars = true) {
        q = (q || "").trim();
        // console.log("SQL QUERY: ", q)
        let result = await queryProps(q);
        return q.startsWith('select') || q.startsWith('SELECT') ?
            trimChars(q.includes('TOP 1 ') ? result.row : result.rows, _trimChars) : result;
        // (q.startsWith('UPDATE') || q.startsWith('update') ?
        //   result.rowsAffected : result)
    }
    async function exec(q, trimChars = true) {
        // return query(q, trimChars)
        return await DataBase.pool.query(q);
    }
    DataBase.exec = exec;
    async function queryProps(q, conn) {
        try {
            // console.log("SQL QUERY: ", q)
            return getProps(await (new mssql_1.default.Request(conn || DataBase.pool)).query(q));
        }
        catch (error) {
            errorlog_1.ErrorLog.save('database.manager.ts', 'queryProps()', q + ' || ' + error);
            return propsError();
        }
    }
    async function count(table, _where) {
        let a = await queryProps(`select count(*) as count from ${table} ${_where ? 'where ' + where(_where) : ''}`);
        return a ? a.row.count : 0;
    }
    DataBase.count = count;
    function select(table, _where, _fields, limit) {
        typeof _where == 'number' && (limit = _where, _fields = null, _where = null);
        typeof _fields == 'number' && (limit = _fields, _fields = null);
        _where && (_where = remplaceWhere(_where, table, _fields));
        return query(`SELECT ${limit ? 'TOP ' + limit : ''} ${_fields ? fields(_fields) : '*'} FROM ${table} ${_where ? 'where ' + where(_where) : ''}`);
    }
    DataBase.select = select;
    // export async function filtrarFechas(table:string, desde:any, hasta:any){
    //    return query(`SELECT * FROM ${table} WHERE fechacreacion BETWEEN '${desde}' AND '${hasta}'`)
    // }
    async function filtrarFechas(table, campo, fecha, _where, _fields, limit) {
        typeof _where == 'number' && (limit = _where, _fields = null, _where = null);
        typeof _fields == 'number' && (limit = _fields, _fields = null);
        _where && (_where = remplaceWhere(_where, table, _fields));
        return query(`SELECT * FROM ${table} ${_where ? 'where ' + where(_where) : ''} AND ${campo} BETWEEN '${fecha._desde}' AND '${fecha._hasta}'`);
    }
    DataBase.filtrarFechas = filtrarFechas;
    function test(_table, _data, _fields) {
    }
    DataBase.test = test;
    function getLastInserted(table, field) {
        field = !field ? 'id' + table : field;
        return select(table, { [field]: 'sql(SELECT MAX($w) FROM $t)' }, 1);
    }
    DataBase.getLastInserted = getLastInserted;
    function replaceByObject(obj, replaceObj) {
        for (let key in replaceObj) {
            if (key in obj) {
                if (typeof replaceObj[key] == 'string') {
                    obj[replaceObj[key]] = obj[key];
                    delete obj[key];
                }
            }
            else
                obj[key] = replaceObj[key];
        }
        return lodash_1.default.cloneDeep(obj);
    }
    function insert(_table, _data, _fields) {
        let _values = [];
        if (!_fields || (_fields && typeof _fields == 'object')) {
            _data = replaceByObject(_data, _fields);
            _values = lodash_1.default.map(lodash_1.default.values(_data), setTypeDate);
            return exec(`insert into ${_table}(${fields(_data)}) values(${lodash_1.default.join(_values, ',')})`);
        }
        try {
            let result = new mssql_1.default.Request(DataBase.pool), _sql = mssql_1.default;
            let rename, _f = [], _fieldsArr = (_fields || "").split(",");
            for (let field of _fieldsArr) {
                let [f, type] = (field || "").trim().split("@");
                if (f.includes(":")) {
                    [rename, f] = f.split(":");
                }
                else
                    rename = null;
                _f.push(f), _values.push("@" + f);
                result.input(f, eval('_sql.' + type), _data[rename || f]);
            }
            return queryProps('insert into ' + _table + '(' + _f.join(",") + ') values(' + _values.join(",") + ')', result);
        }
        catch (error) {
            errorlog_1.ErrorLog.save('database.manager.ts', 'insert()', error.message);
            return propsError();
        }
    }
    DataBase.insert = insert;
    function fastInsert(_table, _data) {
        let _values = lodash_1.default.map(lodash_1.default.values(_data), setTypeDate);
        let consulta = `insert into ${_table}(${lodash_1.default.keys(_data).join(",")}) values(${lodash_1.default.join(_values, ',')})`;
        _saveDiskLog(consulta);
        return queryProps(consulta, DataBase.pool);
    }
    DataBase.fastInsert = fastInsert;
    function update(table, data, _where) {
        return exec(`UPDATE ${table} SET ${setFields(data)} ${_where ? 'where ' + where(_where) : ''}`);
    }
    DataBase.update = update;
    function remove(table, _where) {
        return query(`DELETE FROM ${table} where ${where(_where)}`);
    }
    DataBase.remove = remove;
    function propsError() {
        return getProps({ recordset: [], output: [], rowsAffected: [0], recordsets: [] });
    }
    async function procedure(_name, _data, _fields, _outs) {
        try {
            let result = new mssql_1.default.Request(DataBase.pool), _sql = mssql_1.default, _values = [];
            if (_data) {
                let rename, _f = [], _fieldsArr = (_fields || "").split(","), _outsArr = (_fields || "").split(",");
                for (let field of _fieldsArr) {
                    let [f, type] = (field || "").trim().split("@");
                    if (f.includes(":")) {
                        [rename, f] = f.split(":");
                    }
                    else
                        rename = null;
                    _f.push(f), _values.push("@" + f);
                    result.input(f, eval('_sql.' + type.replace(/max/i, mssql_1.default.MAX)), _data[rename || f]);
                }
            }
            if (_data && _outs) {
                let rename, _f = [], _outsArr = (_outs || "").split(",");
                for (let field of _outsArr) {
                    let [f, type] = (field || "").trim().split("@");
                    if (f.includes(":")) {
                        [rename, f] = f.split(":");
                    }
                    else
                        rename = null;
                    _f.push(f), _values.push("@" + f);
                    result.output(f, eval('_sql.' + type.replace(/max/i, mssql_1.default.MAX)), _data[rename || f]);
                }
            }
            let props = getProps(await result.execute(_name));
            return Object.assign({}, props.out || {}, props || {});
        }
        catch (error) {
            errorlog_1.ErrorLog.save('database.manager.ts', 'procedure()', error.message);
            return 0;
        }
    }
    DataBase.procedure = procedure;
    function _saveDiskLog(data, file) {
        data = `${data} --[${new Date().toLocaleString()}]\n`;
        fs.appendFile(file || "insert - " + new Date().toLocaleDateString().replace(/\//g, "-") + ".log", data, function (err) {
        });
    }
})(DataBase || (exports.DataBase = DataBase = {}));
