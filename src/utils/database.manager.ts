import _ from 'lodash'
import * as fs from 'fs'
// const fs = require('fs');
import sql, { DateTime } from 'mssql'
import { ErrorLog } from "./errorlog";

export namespace DataBase {

  export var pool: sql.ConnectionPool;
  const errorQueue: any[] = []

  export async function connect(settings: any, fnCallback?: ()=> void){
    try {
      pool = await new sql.ConnectionPool(settings).connect();
      fnCallback && fnCallback();
     } catch (error: any) {
      ErrorLog.save('database.manager.ts', 'connect()', error.message)
     }
  }

  function getObjects(obj: any, data?: any) {
    typeof obj != "object" && ( obj = _.reduce( _.split(obj, ','), (a:any, b:any) => Object.assign(a, {[b]: 1 }), {}))
    return data ? ( _.reduce( _.keys(obj), (a:any, b:any)=> Object.assign( a, data[b] ? {[b]: data[b]} : {} ), {}) ) : obj;
  }

  function setTypeDate(data: any) {
    if(typeof data == 'string'){
      return data.startsWith('sql') ? data.replace('sql', '') : "'"+ data + "'"
    }
    return data == null || data == undefined ? 'NULL' : data
  }

  function getProps(query: any) {
    let { recordset, output, rowsAffected, recordsets } = query;
    return { row: _.first(recordset), rows: recordset, out: output,
      rowsAffected: _.reduce(rowsAffected, (a:any, b:any) => a+b, 0), recordsets }
  }

  function setFields(data: any){
    return _.reduce(_.keys(data), (a:any, b:any)=> {
      let val = data[b];
      let simb = (val && typeof val == 'object' && 'add' in val ? '+' : val && typeof val == 'object' && 'sub' in val ? '-' : '') +"=";
      val = val && typeof val == 'object' ? val['add'] || val['sub'] : val;

      return a+b +simb+(setTypeDate(val))+","

    }, "").slice(0 , -1);
  }

  function fields(data: any){
    return _.join(_.keys(getObjects(data)), ',')
  }

  function parseWhere(key: string, val: any) {
    if( val && typeof val == 'object' && 'today' in val){
      val = 'convert(char(8), '+key+', 112)'
      key = 'convert(char(8), getDate(), 112)'
    }else
      val = setTypeDate(val)
    return key +'='+ val //
  }

  function where(data: any) {
    return typeof data == 'string' ? data :  _.reduce(_.keys(data), (a:any, b:any, i:any)=> {
      return a + ( i != 0 ? (b.startsWith('_') ? ' or ' : ' and ') : '') + parseWhere(b.startsWith('_') ? b.replace('_', '') : b, data[b])
    }, "");
  }

  function remplaceWhere(_where: any, table: string, _fields: any){
    function _replace(str: string){
      str = str.replace(/\$t([0-9]+)?/g, table);
      str = str.replace(/\$f([0-9]+)?/g, (a, b)=> _.keys(_fields)[b||0]);
      str = str.replace(/\$w([0-9]+)?/g, (a, b)=> _.keys(_where)[b||0]);
      return str;
    }

    return typeof _where == 'string' ? _replace(_where) : _.reduce(_.keys(_where), (a:any, b:any)=> {
      return Object.assign(a, { [b]: typeof _where[b] == 'string' ? _replace(_where[b]) : _where[b] })
    }, {})
  }

  function trimChars(obj: any, trim: boolean = false){
    if(!trim) return obj;
    let isSingle = !Array.isArray(obj);
    !isSingle || ( obj = [ obj ]);
    obj = _.map(obj, (e:any) => {
      for(let key in e){
        if( e && typeof (<any>e)[key] == 'string') {
          (<any>e)[key] = (<any>e)[key].trim()
        }
      }
      return e;
    })
    return isSingle ? _.first(obj) : obj;
  }
  async function query(q: string, _trimChars: boolean = true){
    q = (q || "").trim();
    // console.log("SQL QUERY: ", q)

    let result = await queryProps(q)

    return q.startsWith('select') || q.startsWith('SELECT') ?
            trimChars(q.includes('TOP 1 ') ? result.row : result.rows, _trimChars) :  result
          // (q.startsWith('UPDATE') || q.startsWith('update') ?
          //   result.rowsAffected : result)
  }

  export async function exec(q: string, trimChars: boolean = true){
    // return query(q, trimChars)
    return await pool.query(q);
  }

  async function queryProps(q: string, conn?: any){
    try {
      // console.log("SQL QUERY: ", q)
      return getProps(await (new sql.Request(conn || pool)).query(q));
    } catch (error) {
      ErrorLog.save('database.manager.ts', 'queryProps()', q +' || '+ error)
      return propsError()
    }
  }

  export async function count(table: string, _where?: any){
    let a = await queryProps(`select count(*) as count from ${table} ${ _where ? 'where '+ where(_where) : ''}`)
    return a ? (<any>a.row).count : 0;
  }
  export function select(table: string, _where?: any, _fields?: any, limit?: number){
    typeof _where == 'number' && ( limit = _where, _fields = null, _where = null)
    typeof _fields == 'number' && ( limit = _fields, _fields = null);
    _where && ( _where = remplaceWhere(_where, table, _fields) )
    return query(`SELECT ${limit ? 'TOP '+ limit : ''} ${ _fields ? fields(_fields) : '*'} FROM ${table} ${ _where ? 'where ' +where(_where) : ''}`)
  }
  // export async function filtrarFechas(table:string, desde:any, hasta:any){
  //    return query(`SELECT * FROM ${table} WHERE fechacreacion BETWEEN '${desde}' AND '${hasta}'`)
  // }
  export async function filtrarFechas(table: string,campo:any,fecha:any, _where?: any, _fields?: any, limit?: number){
    typeof _where == 'number' && ( limit = _where, _fields = null, _where = null)
    typeof _fields == 'number' && ( limit = _fields, _fields = null);
    _where && ( _where = remplaceWhere(_where, table, _fields) )
    return query(`SELECT * FROM ${table} ${ _where ? 'where ' +where(_where) : ''} AND ${campo} BETWEEN '${fecha._desde}' AND '${fecha._hasta}'`)
 }
  export function test(_table: string, _data: any, _fields?: string | Object) {

  }

  export function getLastInserted(table: string, field?: string){
    field = !field ? 'id' + table : field;
    return select(table, { [field]: 'sql(SELECT MAX($w) FROM $t)' }, 1)
  }

  function replaceByObject(obj: any, replaceObj: any){
    for(let key in replaceObj){
      if( key in obj ) {
        if( typeof replaceObj[key] == 'string' ){
          obj[replaceObj[key]] = obj[key]
          delete obj[key];
        }
      }else obj[key] = replaceObj[key]
    }
    return _.cloneDeep(obj);
  }

  export function insert(_table: string, _data: any, _fields?: string | Object) {
    let _values = [];
    if( !_fields || (_fields && typeof _fields == 'object')){
      _data = replaceByObject(_data, _fields);
      _values = _.map(_.values(_data), setTypeDate)
      return exec(`insert into ${_table}(${ fields(_data) }) values(${ _.join(_values, ',') })`)
    }
    try {
      let result = new sql.Request(pool), _sql = sql;
      let rename, _f = [], _fieldsArr = (_fields || "").split(",");

      for(let field of _fieldsArr) {
        let [ f, type ] = (field || "").trim().split("@")
        if(f.includes(":")){
          [ rename, f ] = f.split(":")
        }else rename = null
        _f.push(f), _values.push("@"+f)
        result.input(f, eval('_sql.'+type), _data[rename || f])
      }
      return queryProps('insert into '+ _table + '('+ _f.join(",") +') values('+ _values.join(",") +')', result)
    } catch (error: any) {
      ErrorLog.save('database.manager.ts', 'insert()', error.message)
      return propsError();
    }
  }

  export function fastInsert(_table: string, _data: any) {
    let _values = _.map(_.values(_data), setTypeDate)
    let consulta = `insert into ${_table}(${ _.keys(_data).join(",") }) values(${ _.join(_values, ',') })`
    _saveDiskLog(consulta)
    return queryProps(consulta, pool)
  }

  export function update(table: string, data: any, _where: any) {
    return exec(`UPDATE ${table} SET ${setFields(data)} ${ _where ? 'where ' +where(_where) : ''}`);
  }

  export function remove(table: string, _where: any){
    return query(`DELETE FROM ${table} where ${where(_where)}`)
  }
  function propsError(){
    return getProps({recordset: [], output: [], rowsAffected: [0], recordsets:[]})
  }
  export async function procedure(_name: string, _data?: any, _fields?: any, _outs?: any) {
    try {
      let result = new sql.Request(pool), _sql = sql, _values = [];
      if (_data) {
        let rename, _f = [], _fieldsArr = (_fields || "").split(","), _outsArr = (_fields || "").split(",");
        for (let field of _fieldsArr) {
          let [f, type] = (field || "").trim().split("@")
          if (f.includes(":")) {
            [rename, f] = f.split(":")
          } else rename = null
          _f.push(f), _values.push("@" + f)
          result.input(f, eval('_sql.' + type.replace(/max/i, sql.MAX)), _data[rename || f])
        }
      }
      if (_data && _outs) {
        let rename, _f = [], _outsArr = (_outs || "").split(",");
        for (let field of _outsArr) {
          let [f, type] = (field || "").trim().split("@")
          if (f.includes(":")) {
            [rename, f] = f.split(":")
          } else rename = null
          _f.push(f), _values.push("@" + f)
          result.output(f, eval('_sql.' + type.replace(/max/i, sql.MAX)), _data[rename || f])
        }
      }
      let props = getProps(await result.execute(_name));
      return Object.assign({}, props.out || {}, props || {});
    } catch (error: any) {
      ErrorLog.save('database.manager.ts', 'procedure()', error.message)
      return 0
    }
  }

  function _saveDiskLog(data: string, file?: string) {
    data = `${data} --[${new Date().toLocaleString()}]\n`;
    fs.appendFile(file || "insert - " + new Date().toLocaleDateString().replace(/\//g, "-") + ".log", data, function (err) {
    });
  }

}