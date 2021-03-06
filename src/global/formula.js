import { replaceHtml, getObjType, chatatABC, ABCatNum, luckysheetfontformat } from '../utils/util';
import { getSheetIndex, getRangetxt, getluckysheetfile } from '../methods/get';
import { setluckysheetfile } from '../methods/set';
import { luckyColor } from '../controllers/constant';
import sheetmanage from '../controllers/sheetmanage';
import menuButton from '../controllers/menuButton';
import server from '../controllers/server';
import luckysheetFreezen from '../controllers/freezen';
import { seletedHighlistByindex, luckysheet_count_show } from '../controllers/select';
import { isRealNum, isRealNull, valueIsError, isEditMode } from './validate';
import { isdatetime, isdatatype } from './datecontroll';
import { getCellTextSplitArr } from '../global/getRowlen';
import { getcellvalue } from './getdata';
import { setcellvalue } from './setdata';
import { genarate, valueShowEs } from './format';
import editor from './editor';
import tooltip from './tooltip';
import { rowLocation, colLocation, colLocationByIndex, mouseposition } from './location';
import { luckysheetRangeLast } from './cursorPos';
import { jfrefreshgrid } from './refresh';
// import luckysheet_function from '../function/luckysheet_function';
// import functionlist from '../function/functionlist';
import { luckysheet_compareWith, luckysheet_getarraydata, luckysheet_getcelldata, luckysheet_parseData, luckysheet_getValue, luckysheet_indirect_check, luckysheet_indirect_check_return, luckysheet_offset_check } from '../function/func';
import Store from '../store';
import locale from '../locale/locale';

const luckysheetformula = {
    error: {
        v: "#VALUE!",    //错误的参数或运算符
        n: "#NAME?",     //公式名称错误
        na: "#N/A",      //函数或公式中没有可用数值
        r: "#REF!",      //删除了由其他公式引用的单元格
        d: "#DIV/0!",    //除数是0或空单元格
        nm: "#NUM!",     //当公式或函数中某个数字有问题时
        nl: "#NULL!",    //交叉运算符（空格）使用不正确
        sp: "#SPILL!"    //数组范围有其它值
    },
    errorInfo: function(err) {
        return err;
    },
    errorParamCheck: function(thisp, data, i) {
        let type, require;
        let _locale = locale();
        let locale_formulaMore = _locale.formulaMore;
        if(i < thisp.length){
            type = thisp[i].type;
            require = thisp[i].require;
        }
        else{
            type = thisp[thisp.length - 1].type;
            require = thisp[thisp.length - 1].require;
        }

        if(require == "o" && (data == null || data == "")){
            return [true, locale_formulaMore.tipSuccessText];
        }

        if(type.indexOf("all") > -1){
            return [true, locale_formulaMore.tipSuccessText];
        }
        else{
            if(type.indexOf("range") > -1 && (getObjType(data) == "object" || getObjType(data) == "array")){
                return [true, locale_formulaMore.tipSuccessText];
            }

            if(type.indexOf("number") > -1 && (isRealNum(data) || getObjType(data) == "boolean")){
                return [true, locale_formulaMore.tipSuccessText];
            }
            
            if(type.indexOf("string") > -1 && getObjType(data) == "string"){
                return [true, locale_formulaMore.tipSuccessText];
            }

            if(type.indexOf("date") > -1 && isdatetime(data)){
                return [true, locale_formulaMore.tipSuccessText];
            }

            return [false, locale_formulaMore.tipParamErrorText];
        }
    },
    getPureValueByData: function(data){
        if(data.length == 0){
            return [];
        }

        let output = [];

        if(getObjType(data) == "array"){
            if(getObjType(data[0]) == "array"){
                for(let r = 0; r < data.length; r++){
                    let row = [];

                    for(let c = 0; c < data[0].length; c++){
                        let cell = data[r][c];

                        if(getObjType(cell) == "object"){
                            row.push(cell.v);
                        }
                        else{
                            row.push(cell);
                        }
                    }

                    output.push(row);
                }
            }
            else{
                for(let i = 0; i < data.length; i++){
                    let cell = data[i];

                    if(getObjType(cell) == "object"){
                        output.push(cell.v);
                    }
                    else{
                        output.push(cell);
                    }
                }
            }
        }
        else {
            let cell = data;

            if(getObjType(cell) == "object"){
                output.push(cell.v);
            }
            else{
                output.push(cell);
            }
        }

        return output;
    },
    //sparklines添加
    readCellDataToOneArray: function(rangeValue){
        let _this = this;

        if(rangeValue == null){
            return [];
        }

        if(getObjType(rangeValue) != "object"){
            return [rangeValue];
        }

        let dataformat = [];
        let data = [];

        if(rangeValue != null && rangeValue.data != null){
            data = rangeValue.data;
        }
        else if(rangeValue != null && !isRealNull(rangeValue.v)){
            return [rangeValue.v];
        }
        else{
            return [];
        }

        //适配excel的动态数组格式，{1，2，3，4，5}或者{{1，2，3}，{4，5，6}，{7，8，9}}
        if(getObjType(data) == "array"){
            data = _this.getPureValueByData(data);
        }
        else if(getObjType(data) == "object"){
            data = data.v;

            return [data];
        }
        else{
            if(/\{.*?\}/.test(data)){
                data = data.replace(/\{/g, "[").replace(/\}/g, "]");
            }

            data = eval('('+ data +')');
        }

        //把二维数组转换为一维数组，sparklines要求数据格式为一维数组
        //let dataformat = [];
        if(getObjType(data[0]) == "array"){
            for(let i = 0; i < data.length; i++){
                dataformat = dataformat.concat(data[i]);
            }
        }
        else{
            dataformat = data;
        }

        return dataformat;
    },
    //sparklines添加
    //获得函数里某个参数的值，使用此函数需要在函数中执行luckysheet_getValue方法
    getValueByFuncData: function(value, arg){
        if(value == null){
            return null;
        }

        let _this = this;
        
        if(getObjType(value) == "array"){
            if(arg == "avg"){
                return luckysheet_function.AVERAGE.f.apply(luckysheet_function.AVERAGE, value);
            }
            else if(arg == "sum"){
                return luckysheet_function.SUM.f.apply(luckysheet_function.SUM, value);
            }
            else{
                if(getObjType(value[0]) == "object"){
                    return luckysheet.mask.getValueByFormat(value[0]);
                }
                else{
                    return value[0];
                }
            }
        }
        else if(getObjType(value) == "object"){
            return luckysheet.mask.getValueByFormat(value);
        }
        else{
            return value;
        }
    },
    //sparklines添加
    sparklinesColorMap:function(args, len){
        let _this = this;
        let colorLists = null;
        
        if(len == null){
            len = 5;
        }

        let index = 0;
        
        if(args.length > len){
            for(let i = len; i < args.length; i++){
                let colorMap = args[i];
                let colorListArray = _this.readCellDataToOneArray(colorMap);

                for(let a = 0; a < colorListArray.length; a++){
                    let ca = colorListArray[a];

                    if(ca.indexOf(":") > -1){
                        if(!colorLists){
                            colorLists = {};
                        }

                        let calist = ca.split(":");

                        if(calist.length == 2){
                            colorLists[calist[0]] = calist[1];
                        }
                        else if(calist.length > 1){
                            colorLists[calist[0] + ":" + calist[1]] = calist[2];
                        }
                    }
                    else{
                        if(!colorLists){
                            colorLists = [];
                        }

                        colorLists.push(ca);
                    }
                }

                index++;
            }
        }

        return colorLists;
    },
    //sparklines添加
    colorList: ["#2ec7c9", "#fc5c5c", "#5ab1ef", "#ffb980", "#d87a80", "#8d98b3", "#e5cf0d", "#97b552", "#95706d","#dc69aa","#07a2a4","#9a7fd1","#588dd5","#f5994e","#c05050","#59678c","#c9ab00","#7eb00a","#6f5553","#c14089"],
    classlist: {
        "province": {
            11: "北京",
            12: "天津",
            13: "河北",
            14: "山西",
            15: "内蒙古",
            21: "辽宁",
            22: "吉林",
            23: "黑龙江",
            31: "上海",
            32: "江苏",
            33: "浙江",
            34: "安徽",
            35: "福建",
            36: "江西",
            37: "山东",
            41: "河南",
            42: "湖北",
            43: "湖南",
            44: "广东",
            45: "广西",
            46: "海南",
            50: "重庆",
            51: "四川",
            52: "贵州",
            53: "云南",
            54: "西藏",
            61: "陕西",
            62: "甘肃",
            63: "青海",
            64: "宁夏",
            65: "新疆",
            71: "台湾",
            81: "香港",
            82: "澳门",
            91: "国外"
        }
    },
    oldvalue: null,
    dontupdate: function() {
        let _this = this;

        Store.luckysheetCellUpdate.length = 0; //clear array
        $("#luckysheet-functionbox-cell, #luckysheet-rich-text-editor").html(_this.oldvalue);

        _this.cancelNormalSelected();
        if (_this.rangetosheet != Store.currentSheetIndex) {
            sheetmanage.changeSheetExec(_this.rangetosheet);
        }
    },
    fucntionboxshow: function(r, c) {
        let _this = this;

        let d = Store.flowdata;
        let value = "";
        // && d[r][c].v != null
        if (d[r] != null && d[r][c] != null) {
            let cell = d[r][c];

            if(cell.f != null){
                value = getcellvalue(r, c, d, "f");
            }
            else{
                value = valueShowEs(r, c, d);
            }
        }

        _this.oldvalue = value;
        $("#luckysheet-functionbox-cell").html(value);
    },
    //获得某个单元格或区域的偏移一定距离后的单元格( Sheet1!B6:C8 格式)
    cellOffset: function(range,rows,cols,height,width){// 参数：range or cell , rows,cols,height,width
        let startCell = range.startCell;
        let rowl = range.rowl;
        let coll = range.coll;
        let startCellRow = parseInt(startCell.replace(/[^0-9]/g, ""));
        let startCellCol = ABCatNum(startCell.replace(/[^A-Za-z]/g, ""));

        let row = [],col = [],offsetRange;
        row[0] = startCellRow + rows;
        col[0] = startCellCol + cols;

        row[1] = row[0] + height - 1;
        col[1] = col[0] + width - 1;

        col[0] = chatatABC(col[0]);
        col[1] = chatatABC(col[1]);

        let cellF = col[0] + row[0];
        let cellL = col[1] + row[1];

        if(cellF == cellL){
            offsetRange =  range.sheetName + "!"+ cellF;
        }
        else{
            offsetRange = range.sheetName + "!"+ cellF + ":" + cellL;
        }

        return offsetRange;
    },
    parseDatetoNum: function(date){ //函数中获取到时间格式或者数字形式统一转化为数字进行运算 
        let _this = this;

        if(typeof(date) == "object" && typeof date.v == "number"){
            date = date.v;
        }
        else if(isdatatype(date) == "num"){
            date = parseFloat(date);
        }
        else if(isdatatype(date) == "date"){
            date = genarate(date)[2];
        }
        else{
            return _this.error.v;
        }

        return date;
    },
    //获取一维数组
    getRangeArray: function(range){
        let rangeNow = [];
        let fmt = "General";

        if(range.length == 1){ //一行
            for(let c = 0; c < range[0].length; c++){
                if(range[0][c] != null && range[0][c].v){
                    rangeNow.push(range[0][c].v);
                    let f = range[0][c].ct.fa;
                    fmt = (fmt == "General") ? f : fmt;
                }
                else{
                    //若单元格为null或为空，此处推入null（待考虑是否使用"null"）
                    rangeNow.push(null);
                }
            }
        }
        else if(range[0].length == 1){ //一列
            for(let r = 0; r < range.length; r++){
                if(range[r][0] != null && range[r][0].v){
                    rangeNow.push(range[r][0].v);
                    let f = range[r][0].ct.fa;
                    fmt = (fmt == "General") ? f : fmt;
                }
                else{
                    rangeNow.push(null);
                }
            }
        }
        else{
            for(let r = 0; r < range.length; r++){
                for(let c = 0; c < range[r].length; c++){
                    if(range[r][c] != null && range[r][c].v){
                        rangeNow.push(range[r][c].v);
                        let f = range[r][c].ct.fa;
                        fmt = (fmt == "General") ? f : fmt;
                    }
                    else{
                        rangeNow.push(null);
                    }
                }
            }
        }

        range = rangeNow;
        
        return [range, fmt];
    },
    //获取二维数组：qksheet格式[[{v,m,ct}] ==> [1]
    getRangeArrayTwo: function(range){
        let data = $.extend(true, [], range);

        if(data.length == 1){ //一行
            for(let c = 0; c < data[0].length; c++){
                if(data[0][c] instanceof Object){
                    if(data[0][c] != null && data[0][c] instanceof Object && !!data[0][c].m){
                        data[0][c] = data[0][c].m;
                    }
                    else{
                        if(data[0][c] != null && data[0][c] instanceof Object && !!data[0][c].v){
                            data[0][c] = data[0][c].v;
                        }
                        else{
                            data[0][c] = null;
                        }
                    }
                }
            }
        }
        else if(data[0].length == 1){ //一列
            for(let r = 0; r < data.length; r++){
                if(data[r][0] instanceof Object){
                    if(data[r][0] != null && data[r][0] instanceof Object && !!data[r][0].m){
                        data[r][0] = data[r][0].m;
                    }
                    else{
                        if(data[r][0] != null && data[r][0] instanceof Object && !!data[r][0].v){
                            data[r][0] = data[r][0].v;
                        }
                        else{
                            data[r][0] = null;
                        }
                    }
                }
            }
        }
        else{
            for(let r = 0; r < data.length; r++){
                for(let c = 0; c < data[r].length; c++){
                    if(data[r][c] instanceof Object){
                        if(data[r][c] != null && data[r][c] instanceof Object && !!data[r][c].m){
                            data[r][c] = data[r][c].m;
                        }
                        else{
                            if(data[r][c] != null && data[r][c] instanceof Object && !!data[r][c].v){
                                data[r][c] = data[r][c].v;
                            }
                            else{
                                data[r][c] = null;
                            }
                        }
                    }
                }
            }
        }

        return data;
    },
    isWildcard: function(a, b){ //正则匹配通配符: * ? ~* ~?,a目标参数，b通配符
        let _this = this;

        a = a.toString();
        b = b.toString();
      
        if(_this.isCompareOperator(b).flag){
            b = _this.isCompareOperator(b).num;
        }

        let str = "";
        for(let i = 0; i < b.length; i++){
            let v = b.charAt(i);
        
            if(v == "*" ){
                str += ".*";
            }
            else if(v == "?"){
                str += ".";
            }
            else if(v == "~"){
                if(b.charAt(i+1) == "*"){
                    str += "\\*";
                    i++;
                }
                else if(b.charAt(i+1) == "?"){
                    str += "\\?";
                    i++;
                }
                else{
                    str += "~";
                }
            }
            else{
                str += v;
            }
        }
      
        let reg = new RegExp("^" + str + "$", "g");

        return !!a.match(reg);
    },
    isCompareOperator: function(str){ //判断前一个或者两个字符是否是比较运算符
        str = str.toString();
        let ope = ""; //存放比较运算符
        let num = ""; //截取比较运算符之后的数字用于实际比较
        let strOne = str.substr(0,1); 
        let strTwo = str.substr(1,1);
        let flag = false;
        let ret;

        if(strOne == ">"){
            if(strTwo == "="){
                ope = str.substr(0,2);
                num = str.substr(2);
                flag = true;
            }
            else if(strTwo != "="){
                ope = str.substr(0,1);
                num = str.substr(1);
                flag = true;
            }
        }
        else if(strOne == "<"){
            if(strTwo == "=" || strTwo == ">"){
                ope = str.substr(0,2);
                num = str.substr(2);
                flag = true;
            }
            else if(strTwo != "=" && strTwo != ">"){
                ope = str.substr(0,1);
                num = str.substr(1);
                flag = true;
            }
        }
        else if(strOne == "=" && strTwo != "="){
            ope = str.substr(0,1);
            num = str.substr(1);
            flag = true;
        }

        ret = { "flag": flag, "ope": ope, "num": num };

        return ret;
    },
    acompareb: function(a, b){ //a 与 b比较，b可为含比较符，通配符
        let _this = this;
        let flag = false;

        if(isRealNum(b)){
            flag = luckysheet_compareWith(a, "==", b);
        }
        else if(typeof(b) == "string"){ //条件输入字符串，如：">233"
            if(b.indexOf("*") != -1 || b.indexOf("?") != -1){ // 正则匹配：输入通配符："黑*","白?",以及"白?黑*~*"
                //通配符函数
                return _this.isWildcard(a, b);
            }
            else if(_this.isCompareOperator(b).flag){ //"黑糖"
                let ope = _this.isCompareOperator(b).ope;
                let num = _this.isCompareOperator(b).num;
                flag = luckysheet_compareWith(a, ope, num);
            }
            else{
                flag = luckysheet_compareWith(a, "==", b);
            }
        }

        return flag;
    },
    compareParams: function(fp, sp, sym){  //比较两个字符串或者数字的大小，支持比较对象,暂不支持数组
        let flag = false;

        //判断a和b的数据类型
        let classNameA = toString.call(fp),
            classNameB = toString.call(sp);
        
        if(sym == ">" && fp > sp){
            flag = true;
        }
        else if(sym == ">=" && fp >= sp){
            flag = true;
        }
        else if(sym == "<" && fp < sp){
            flag = true;
        }
        else if(sym == "<=" && fp <= sp){
            flag = true;
        }
        else if(sym == "=" && fp == sp){
            flag = true;
        }
        else if(sym == "<>" && fp != sp){
            flag = true;
        }

        //对象类型比较相等
        if(classNameA == '[object Object]' && classNameB == '[object Object]'){
            //获取a和b的属性长度
            let propsA = Object.getOwnPropertyNames(fp),
                propsB = Object.getOwnPropertyNames(sp);

            if(propsA.length != propsB.length){
                return false;
            }

            for(let i = 0; i < propsA.length; i++){
                let propName=propsA[i];
                //如果对应属性对应值不相等，则返回false
                if(fp[propName] !== sp[propName]){
                    return false;
                }
            }

            return true;
        }

        //数组类型
        if(classNameA == '[object Array]' && classNameB == '[object Array]'){
            if(fp.toString() == sp.toString()){
                return true;
            }

            return false;
        }
        
        return flag;
    },
    parseDecimal: function(num){
        num = parseFloat(num);
        let d = parseInt(num, 10);
        
        if(d == 0){
            return num;
        }

        num = num % d;
        return num;
    },
    getcellrange: function(txt) {
        let val = txt.split("!");

        let sheettxt = "",
            rangetxt = "",
            sheetIndex = -1,
            sheetdata = null;
        
        let luckysheetfile = getluckysheetfile();

        if (val.length > 1) {
            sheettxt = val[0];
            rangetxt = val[1];
            
            for (let i in luckysheetfile) {
                if (sheettxt == luckysheetfile[i].name) {
                    sheetIndex = luckysheetfile[i].index;
                    sheetdata = luckysheetfile[i].data;
                    break;
                }
            }
        } 
        else {
            let index = getSheetIndex(Store.currentSheetIndex);
            sheettxt = luckysheetfile[index].name;
            sheetIndex = luckysheetfile[index].index;
            sheetdata = Store.flowdata;
            rangetxt = val[0];
        }
        
        if (rangetxt.indexOf(":") == -1) {
            let row = parseInt(rangetxt.replace(/[^0-9]/g, "")) - 1;
            let col = ABCatNum(rangetxt.replace(/[^A-Za-z]/g, ""));

            if (!isNaN(row) && !isNaN(col)) {
                return {
                    "row": [row, row],
                    "column": [col, col],
                    "sheetIndex": sheetIndex
                };
            }
            else {
                return null;
            }
        } 
        else {
            rangetxt = rangetxt.split(":");
            let row = [],col = [];
            row[0] = parseInt(rangetxt[0].replace(/[^0-9]/g, "")) - 1;
            row[1] = parseInt(rangetxt[1].replace(/[^0-9]/g, "")) - 1;
            if (isNaN(row[0])) {
                row[0] = 0;
            }
            if (isNaN(row[1])) {
                row[1] = sheetdata.length - 1;
            }
            if (row[0] > row[1]) {
                return null;
            }
            col[0] = ABCatNum(rangetxt[0].replace(/[^A-Za-z]/g, ""));
            col[1] = ABCatNum(rangetxt[1].replace(/[^A-Za-z]/g, ""));
            if (isNaN(col[0])) {
                col[0] = 0;
            }
            if (isNaN(col[1])) {
                col[1] = sheetdata[0].length - 1;
            }
            if (col[0] > col[1]) {
                return null;
            }

            return {
                "row": row,
                "column": col,
                "sheetIndex": sheetIndex
            };
        }
    },
    rangeHightlightHTML: '<div id="luckysheet-formula-functionrange-highlight-${id}" rangeindex="${id}"  class="luckysheet-selection-highlight luckysheet-formula-functionrange-highlight"><div data-type="top" class="luckysheet-selection-copy-top luckysheet-copy"></div><div data-type="right" class="luckysheet-selection-copy-right luckysheet-copy"></div><div data-type="bottom" class="luckysheet-selection-copy-bottom luckysheet-copy"></div><div data-type="left" class="luckysheet-selection-copy-left luckysheet-copy"></div><div class="luckysheet-selection-copy-hc"></div><div data-type="lt" class="luckysheet-selection-highlight-topleft luckysheet-highlight"></div><div data-type="rt" class="luckysheet-selection-highlight-topright luckysheet-highlight"></div><div data-type="lb" class="luckysheet-selection-highlight-bottomleft luckysheet-highlight"></div><div data-type="rb" class="luckysheet-selection-highlight-bottomright luckysheet-highlight"></div></div>',
    createRangeHightlight: function() {
        let _this = this;

        let $span = $("#luckysheet-rich-text-editor").find("span.luckysheet-formula-functionrange-cell");
        $("#luckysheet-formula-functionrange .luckysheet-formula-functionrange-highlight").remove();

        $span.each(function() {
            let rangeindex = $(this).attr("rangeindex"),
                range = $(this).text();

            $("#luckysheet-formula-functionrange").append(replaceHtml(_this.rangeHightlightHTML, {
                "id": rangeindex
            }));

            let cellrange = _this.getcellrange(range);
            let rangeid = "luckysheet-formula-functionrange-highlight-" + rangeindex;

            if (cellrange == null) {

            } 
            else if (cellrange.sheetIndex == Store.currentSheetIndex || (cellrange.sheetIndex == -1 && _this.rangetosheet == Store.currentSheetIndex)) {
                $("#" + rangeid).data("range", cellrange)
                .find(".luckysheet-copy")
                .css({ "background": luckyColor[rangeindex] })
                .end()
                .find(".luckysheet-highlight")
                .css({ "background": luckyColor[rangeindex] })
                .end()
                .find(".luckysheet-selection-copy-hc")
                .css({ "background": luckyColor[rangeindex] });

                seletedHighlistByindex(rangeid, cellrange.row[0], cellrange.row[1], cellrange.column[0], cellrange.column[1]);
            }
        });

        $("#luckysheet-formula-functionrange .luckysheet-formula-functionrange-highlight").show();
    },
    searchHTML: '<div id="luckysheet-formula-search-c" class="luckysheet-formula-search-c"></div>',
    helpHTML: '<div id="luckysheet-formula-help-c" class="luckysheet-formula-help-c"> <div class="luckysheet-formula-help-close" title="${helpClose}"><i class="fa fa-times" aria-hidden="true"></i></div> <div class="luckysheet-formula-help-collapse" title="${helpCollapse}"><i class="fa fa-angle-up" aria-hidden="true"></i></div> <div class="luckysheet-formula-help-title"><div class="luckysheet-formula-help-title-formula"> <span class="luckysheet-arguments-help-function-name">SUM</span> <span class="luckysheet-arguments-paren">(</span> <span class="luckysheet-arguments-parameter-holder"> <span class="luckysheet-arguments-help-parameter luckysheet-arguments-help-parameter-active" dir="auto">A2:A100</span>, <span class="luckysheet-arguments-help-parameter" dir="auto">101</span> </span> <span class="luckysheet-arguments-paren">)</span> </div></div> <div class="luckysheet-formula-help-content"> <div class="luckysheet-formula-help-content-example"> <div class="luckysheet-arguments-help-section-title">${helpExample}</div> <div class="luckysheet-arguments-help-formula"> <span class="luckysheet-arguments-help-function-name">SUM</span> <span class="luckysheet-arguments-paren">(</span> <span class="luckysheet-arguments-parameter-holder"> <span class="luckysheet-arguments-help-parameter luckysheet-arguments-help-parameter-active" dir="auto">A2:A100</span>, <span class="luckysheet-arguments-help-parameter" dir="auto">101</span> </span> <span class="luckysheet-arguments-paren">)</span> </div> </div> <div class="luckysheet-formula-help-content-detail"> <div class="luckysheet-arguments-help-section"> <div class="luckysheet-arguments-help-section-title luckysheet-arguments-help-parameter-name">${helpAbstract}</div> <span class="luckysheet-arguments-help-parameter-content">${helpAbstract}</span> </div> </div> <div class="luckysheet-formula-help-content-param"> ${param} </div> </div> <div class="luckysheet-formula-help-foot"></div></div>',
    getrangeseleciton: function() {
        let currSelection = window.getSelection();
        let anchor = $(currSelection.anchorNode);
        let anchorOffset = currSelection.anchorOffset;

        if (anchor.parent().is("span") && anchorOffset != 0) {
            let txt = $.trim(anchor.text()),
                lasttxt = "";

            if (txt.length == 0 && anchor.parent().prev().length > 0) {
                let ahr = anchor.parent().prev();
                txt = $.trim(ahr.text());
                lasttxt = txt.substr(txt.length - 1, 1);
                return ahr;
            } 
            else {
                lasttxt = txt.substr(anchorOffset - 1, 1);
                return anchor.parent();
            }
        } 
        else if (anchor.is("#luckysheet-rich-text-editor") || anchor.is("#luckysheet-functionbox-cell")) {
            let txt = $.trim(anchor.find("span").last().text());

            if (txt.length == 0 && anchor.find("span").length > 1) {
                let ahr = anchor.find("span");
                txt = $.trim(ahr.eq(ahr.length - 2).text());
                return ahr;
            } 
            else {
                return anchor.find("span").last();
            }
        } 
        else if (anchor.parent().is("#luckysheet-rich-text-editor") || anchor.parent().is("#luckysheet-functionbox-cell") || anchorOffset == 0) {
            if (anchorOffset == 0) {
                anchor = anchor.parent();
            }

            if (anchor.prev().length > 0) {
                let txt = $.trim(anchor.prev().text());
                let lasttxt = txt.substr(txt.length - 1, 1);
                return anchor.prev();
            }
        }

        return null;
    },
    searchFunctionPosition: function($menu, $editor, x, y, isparam) {
        let winH = $(window).height(),
            winW = $(window).width();
        let menuW = $menu.outerWidth(),
            menuH = $menu.outerHeight();

        if (isparam == null) {
            isparam = false;
        }

        let left = x;
        if (x + menuW > winW) {
            left = x - menuW + $editor.outerWidth();
        } 
        else {
            left = x;
        }

        let top = y;
        if (y + menuH > winH) {
            top = y - menuH;
        } 
        else {
            top = y + $editor.outerHeight();
            if (!isparam) {
                $menu.html($menu.find(".luckysheet-formula-search-item").get().reverse());
            }
        }

        if (top < 0) {
            top = 0;
        }
        if (left < 0) {
            left = 0;
        }

        $menu.css({
            "top": top,
            "left": left
        }).show();
    },
    searchFunctionCell: null,
    searchFunction: function($editer) {
        let _this = this;
        let functionlist = Store.functionlist;

        let $cell = _this.getrangeseleciton();
        _this.searchFunctionCell = $cell;

        if ($cell == null || $editer == null) {
            return;
        }

        let searchtxt = $cell.text().toUpperCase();
        let reg = /^[a-zA-Z]|[a-zA-Z_]+$/;
        
        if (!reg.test(searchtxt)) {
            return;
        }

        let result = {
                "f": [],
                "s": [],
                "t": []
            },
            result_i = 0;

        for (let i = 0; i < functionlist.length; i++) {
            let item = functionlist[i],
                n = item.n;

            if (n == searchtxt) {
                result.f.unshift(item);
                result_i++;
            } 
            else if (n.substr(0, searchtxt.length) == searchtxt) {
                result.s.unshift(item);
                result_i++;
            } 
            else if (n.indexOf(searchtxt) > -1) {
                result.t.unshift(item);
                result_i++;
            }

            if (result_i >= 10) {
                break;
            }
        }

        let list = result.t.concat(result.s.concat(result.f));
        if (list.length <= 0) {
            return;
        }

        let listHTML = _this.searchFunctionHTML(list);
        $("#luckysheet-formula-search-c").html(listHTML).show();
        $("#luckysheet-formula-help-c").hide();

        let $c = $editer.parent(),
            offset = $c.offset();
        _this.searchFunctionPosition($("#luckysheet-formula-search-c"), $c, offset.left, offset.top);
    },
    searchFunctionEnter: function($obj) {
        let _this = this;

        let functxt = $obj.data("func");
        _this.searchFunctionCell.text(functxt).after('<span dir="auto" class="luckysheet-formula-text-color">(</span>');
        _this.setCaretPosition(_this.searchFunctionCell.next().get(0), 0, 1);
        $("#luckysheet-formula-search-c").hide();
        _this.helpFunctionExe(_this.searchFunctionCell.closest("div"), _this.searchFunctionCell.next());
    },
    searchFunctionHTML: function(list) {
        let _this = this;

        if ($("#luckysheet-formula-search-c").length == 0) {
            $("body").append(_this.searchHTML);
            $("#luckysheet-formula-search-c").on("mouseover", ".luckysheet-formula-search-item", function() {
                $("#luckysheet-formula-search-c").find(".luckysheet-formula-search-item").removeClass("luckysheet-formula-search-item-active");
                $(this).addClass("luckysheet-formula-search-item-active");
            }).on("mouseout", ".luckysheet-formula-search-item", function() {

            }).on("click", ".luckysheet-formula-search-item", function() {
                if (_this.searchFunctionCell == null) {
                    return;
                }
                _this.searchFunctionEnter($(this));
            });
        }

        let itemHTML = '<div data-func="${n}" class="luckysheet-formula-search-item ${class}"><div class="luckysheet-formula-search-func">${n}</div><div class="luckysheet-formula-search-detail">${a}</div></div>';
        let retHTML = "";
        
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            if (i == list.length - 1) {
                retHTML += replaceHtml(itemHTML, {
                    "class": "luckysheet-formula-search-item-active",
                    "n": item.n,
                    "a": item.a
                });
            } 
            else {
                retHTML += replaceHtml(itemHTML, {
                    "class": "",
                    "n": item.n,
                    "a": item.a
                });
            }
        }

        return retHTML;
    },
    functionlistPosition: {},
    helpFunction: function($editer, funcname, paramIndex) {
        let _this = this;
        let functionlist = Store.functionlist;

        let $func = functionlist[_this.functionlistPosition[$.trim(funcname).toUpperCase()]];
        if ($func == null) {
            return;
        }

        let _locale = locale();
        let locale_formulaMore = _locale.formulaMore;

        $("#luckysheet-formula-help-c .luckysheet-arguments-help-function-name").html($func.n);
        $("#luckysheet-formula-help-c .luckysheet-arguments-help-parameter-content").html($func.d);
        
        let helpformula = '<span class="luckysheet-arguments-help-function-name">${name}</span> <span class="luckysheet-arguments-paren">(</span> <span class="luckysheet-arguments-parameter-holder"> ${param} </span> <span class="luckysheet-arguments-paren">)</span>';
        let helpformulaItem = '<span class="luckysheet-arguments-help-parameter" dir="auto">${param}</span>';
        let helpformulaArg = '<div class="luckysheet-arguments-help-section"><div class="luckysheet-arguments-help-section-title">${param}</div><span class="luckysheet-arguments-help-parameter-content">${content}</span></div>';
        
        //"n": "AVERAGE",
        //"t": "1",
        //"d": "返回数据集的算术平均值，对文本忽略不计。",
        //"a": "返回数据集的算术平均值",
        //"p": [{ "name": "数值1", "example": "A2:A100", "detail": "计算平均值时用到的第一个数值或范围。", "require": "m", "repeat": "n", "type": "rangenumber" },
        //    { "name": "数值2", "example": "B2:B100", "detail": "计算平均值时用到的其他数值或范围。", "require": "o", "repeat": "y", "type": "rangenumber" }
        //]
        let fht = "",
            ahf = "",
            fhcp = "";

        for (let i = 0; i < $func.p.length; i++) {
            let paramitem = $func.p[i];
            let name = paramitem.name,
                nameli = paramitem.name;

            if (paramitem.repeat == "y") {
                name += ", ...";
                nameli += '<span class="luckysheet-arguments-help-argument-info">...-'+locale_formulaMore.allowRepeatText+'</span>';
            }
            if (paramitem.require == "o") {
                name = "[" + name + "]";
                nameli += '<span class="luckysheet-arguments-help-argument-info">-['+locale_formulaMore.allowOptionText+']</span>';
            }

            fht += '<span class="luckysheet-arguments-help-parameter" dir="auto">' + name + '</span>, ';
            ahf += '<span class="luckysheet-arguments-help-parameter" dir="auto">' + paramitem.example + '</span>, ';
            fhcp += replaceHtml(helpformulaArg, {
                "param": nameli,
                "content": paramitem.detail
            });
        }

        fht = fht.substr(0, fht.length - 2);
        ahf = ahf.substr(0, ahf.length - 2);
        
        $("#luckysheet-formula-help-c .luckysheet-formula-help-title .luckysheet-arguments-parameter-holder").html(fht); //介绍
        $("#luckysheet-formula-help-c .luckysheet-arguments-help-formula .luckysheet-arguments-parameter-holder").html(ahf); //示例
        $("#luckysheet-formula-help-c .luckysheet-formula-help-content-param").html(fhcp); //参数
        
        if(paramIndex == null){
            $("#luckysheet-formula-help-c .luckysheet-formula-help-title-formula .luckysheet-arguments-help-function-name").css("font-weight", "bold");
        }
        else{
            $("#luckysheet-formula-help-c .luckysheet-formula-help-title-formula .luckysheet-arguments-help-function-name").css("font-weight", "normal");
            let index = paramIndex >= $func.p.length ? $func.p.length - 1 : paramIndex;
            $("#luckysheet-formula-help-c .luckysheet-formula-help-title .luckysheet-arguments-parameter-holder .luckysheet-arguments-help-parameter").removeClass("luckysheet-arguments-help-parameter-active");
            $("#luckysheet-formula-help-c .luckysheet-formula-help-title .luckysheet-arguments-parameter-holder .luckysheet-arguments-help-parameter").eq(index).addClass("luckysheet-arguments-help-parameter-active");
            $("#luckysheet-formula-help-c .luckysheet-arguments-help-formula .luckysheet-arguments-parameter-holder .luckysheet-arguments-help-parameter").removeClass("luckysheet-arguments-help-parameter-active");
            $("#luckysheet-formula-help-c .luckysheet-arguments-help-formula .luckysheet-arguments-parameter-holder .luckysheet-arguments-help-parameter").eq(index).addClass("luckysheet-arguments-help-parameter-active");
            $("#luckysheet-formula-help-c .luckysheet-formula-help-content-param .luckysheet-arguments-help-section").removeClass("luckysheet-arguments-help-parameter-active");
            $("#luckysheet-formula-help-c .luckysheet-formula-help-content-param .luckysheet-arguments-help-section").eq(index).addClass("luckysheet-arguments-help-parameter-active");
        }

        let $c = $editer.parent(),
            offset = $c.offset();
        _this.searchFunctionPosition($("#luckysheet-formula-help-c"), $c, offset.left, offset.top, true);
    },
    helpFunctionExe: function($editer, currSelection) {
        let _this = this;
        let functionlist = Store.functionlist;
        let _locale = locale();
        let locale_formulaMore = _locale.formulaMore;
        if ($("#luckysheet-formula-help-c").length == 0) {
            $("body").after(replaceHtml(_this.helpHTML,{
                helpClose:locale_formulaMore.helpClose,
                helpCollapse:locale_formulaMore.helpCollapse,
                helpExample:locale_formulaMore.helpExample,
                helpAbstract:locale_formulaMore.helpAbstract,
            }));
            $("#luckysheet-formula-help-c .luckysheet-formula-help-close").click(function() {
                $("#luckysheet-formula-help-c").hide();
            });
            $("#luckysheet-formula-help-c .luckysheet-formula-help-collapse").click(function() {
                let $content = $("#luckysheet-formula-help-c .luckysheet-formula-help-content");
                $content.slideToggle(100, function() {
                    let $c = _this.rangeResizeTo.parent(),
                        offset = $c.offset();
                    _this.searchFunctionPosition($("#luckysheet-formula-help-c"), $c, offset.left, offset.top, true);
                });

                if ($content.is(":hidden")) {
                    $(this).html('<i class="fa fa-angle-up" aria-hidden="true"></i>');
                } 
                else {
                    $(this).html('<i class="fa fa-angle-down" aria-hidden="true"></i>');
                }
            });

            for (let i = 0; i < functionlist.length; i++) {
                _this.functionlistPosition[functionlist[i].n] = i;
            }
        }

        if(!currSelection){
            return;
        }

        let $prev = currSelection,
            funcLen = $editer.length, 
            $span = $editer.find("span"),
            currentIndex = currSelection.index(),
            i = currentIndex;

        if ($prev == null) {
            return;
        }

        let funcName = null, paramindex= null;

        if($span.eq(i).is(".luckysheet-formula-text-func")){
            funcName = $span.eq(i).text();
        }
        else{
            let $cur = null, exceptIndex = [-1, -1];

            while (--i > 0) {
                $cur = $span.eq(i);
                
                if($cur.is(".luckysheet-formula-text-func")  || $.trim($cur.text()).toUpperCase() in _this.functionlistPosition){
                    funcName = $cur.text();
                    paramindex = null;
                    let endstate = true;
                    
                    for(let a = i; a <= currentIndex; a++){
                        if(!paramindex){
                            paramindex = 0;
                        }

                        if(a >= exceptIndex[0] && a <= exceptIndex[1]){
                            continue;
                        }

                        $cur = $span.eq(a);
                        if($cur.is(".luckysheet-formula-text-rpar")){
                            exceptIndex = [i , a];
                            funcName = null;
                            endstate = false;
                            break;
                        }

                        if($cur.is(".luckysheet-formula-text-comma")){
                            paramindex++;
                        }
                    }

                    if(endstate){
                        break;
                    }
                }
            }
        }

        if(funcName == null){
            return;
        }
        
        _this.helpFunction($editer, funcName, paramindex);
    },
    rangeHightlightselected: function($editer, kcode) {
        let _this = this;

        let currSelection = _this.getrangeseleciton();
        $("#luckysheet-formula-search-c, #luckysheet-formula-help-c").hide();
        $("#luckysheet-formula-functionrange .luckysheet-formula-functionrange-highlight .luckysheet-selection-copy-hc").css("opacity", "0.03");
        $("#luckysheet-formula-search-c, #luckysheet-formula-help-c").hide();
        _this.helpFunctionExe($editer, currSelection);
        
        if ($(currSelection).closest(".luckysheet-formula-functionrange-cell").length == 0) {
            _this.searchFunction($editer);
            return;
        }
        
        let $anchorOffset = $(currSelection).closest(".luckysheet-formula-functionrange-cell");
        let rangeindex = $anchorOffset.attr("rangeindex");
        let rangeid = "luckysheet-formula-functionrange-highlight-" + rangeindex;
        
        $("#" + rangeid).find(".luckysheet-selection-copy-hc").css({
            "opacity": "0.13"
        });
    },
    updatecell: function(r, c) {
        let _this = this;

        let $input = $("#luckysheet-rich-text-editor"),
            value = $input.text();

        if (_this.rangetosheet != Store.currentSheetIndex) {
            sheetmanage.changeSheetExec(_this.rangetosheet);
        }

        let curv = Store.flowdata[r][c];

        if(isRealNull(value)){
            if(curv == null || (isRealNull(curv.v) && curv.spl == null)){
                _this.cancelNormalSelected();
                return;
            }
        }
        else{
            if (getObjType(curv) == "object" && (value == curv.f || value == curv.v || value == curv.m)) {
                _this.cancelNormalSelected();
                return;
            } 
            else if (value == curv) {
                _this.cancelNormalSelected();
                return;
            }
        }

        if (value.slice(0, 1) == "=" && value.length > 1) {

        }
        else if(getObjType(curv) == "object" && curv.ct != null && curv.ct.fa != null && curv.ct.fa != "@" && !isRealNull(value)){
            delete curv.m;//更新时间m处理 ， 会实际删除单元格数据的参数（flowdata时已删除）
            if(curv.f != null){ //如果原来是公式，而更新的数据不是公式，则把公式删除
                delete curv.f;
                delete curv.spl; //删除单元格的sparklines的配置串
            }
        }
        
        window.luckysheet_getcelldata_cache = null;

        let isRunExecFunction = true;
        
        let d = editor.deepCopyFlowData(Store.flowdata);

        if (getObjType(curv) == "object") {
            if(getObjType(value) == "string" && value.slice(0, 1) == "=" && value.length > 1){
                let v = _this.execfunction(value, r, c, true);

                curv = _this.execFunctionGroupData[r][c];
                curv.f = v[2];

                //打进单元格的sparklines的配置串， 报错需要单独处理。
                if(v.length == 4 && v[3].type == "sparklines"){
                    delete curv.m;
                    delete curv.v;

                    let curCalv = v[3].data;

                    if(getObjType(curCalv) == "array" && getObjType(curCalv[0]) != "object"){
                        curv.v = curCalv[0];
                    }
                    else{
                        curv.spl = v[3].data;
                    }
                }
            }
            else{
                _this.delFunctionGroup(r, c);
                _this.execFunctionGroup(r, c, value);
                isRunExecFunction = false;
                curv = _this.execFunctionGroupData[r][c];

                delete curv.f;
                delete curv.spl;
            }

            value = curv;
        } 
        else {
            if(getObjType(value) == "string" && value.slice(0, 1) == "=" && value.length > 1){
                let v = _this.execfunction(value, r, c, true);

                value = {
                    "v": v[1],
                    "f": v[2]
                };

                //打进单元格的sparklines的配置串， 报错需要单独处理。
                if(v.length == 4 && v[3].type == "sparklines"){
                    let curCalv = v[3].data;

                    if(getObjType(curCalv) == "array" && getObjType(curCalv[0]) != "object"){
                        value.v = curCalv[0];
                    }
                    else{
                        value.spl = v[3].data;
                    }
                }
            }
            else{
                _this.delFunctionGroup(r, c);
                _this.execFunctionGroup(r, c, value);
                isRunExecFunction = false;
            }
        }

        setcellvalue(r, c, d, value);
        _this.cancelNormalSelected();

        let RowlChange = false;
        let cfg = $.extend(true, {}, getluckysheetfile()[getSheetIndex(Store.currentSheetIndex)]["config"]);
        if(cfg["rowlen"] == null){
            cfg["rowlen"] = {};
        }

        if(d[r][c].tb == "2" && d[r][c].v != null){//自动换行
            let defaultrowlen = 19;

            let offlinecanvas = $("#luckysheetTableContentF").get(0).getContext("2d");
            offlinecanvas.textBaseline = 'top'; //textBaseline以top计算

            let fontset = luckysheetfontformat(d[r][c]);
            offlinecanvas.font = fontset;

            let currentRowLen = defaultrowlen;
            if(cfg["rowlen"][r] != null){
                currentRowLen = cfg["rowlen"][r];
            }

            let strValue = getcellvalue(r, c, d).toString();
            let measureText = offlinecanvas.measureText(strValue);

            let textMetrics = measureText.width;
            let cellWidth = colLocationByIndex(c)[1] - colLocationByIndex(c)[0] - 4;
            let oneLineTextHeight = measureText.actualBoundingBoxDescent - measureText.actualBoundingBoxAscent;

            if(textMetrics > cellWidth){
                let strArr = [];//文本截断数组
                strArr = getCellTextSplitArr(strValue, strArr, cellWidth, offlinecanvas);

                let computeRowlen = oneLineTextHeight * strArr.length + 4;
                //比较计算高度和当前高度取最大高度
                if(computeRowlen > currentRowLen){
                    currentRowLen = computeRowlen;
                }
            }

            if(currentRowLen != defaultrowlen){
                cfg["rowlen"][r] = currentRowLen;
                RowlChange = true;
            }
        }
        
        if(RowlChange){
            jfrefreshgrid(d, [{ "row": [r, r], "column": [c, c] }], cfg, null, RowlChange, isRunExecFunction);
        }
        else {
            jfrefreshgrid(d, [{ "row": [r, r], "column": [c, c] }], undefined, undefined, undefined, isRunExecFunction);
        }

        // Store.luckysheetCellUpdate.length = 0; //clear array
        _this.execFunctionGroupData = null; //销毁
    },
    cancelNormalSelected: function() {
        let _this = this;

        _this.canceFunctionrangeSelected();
        
        $("#luckysheet-formula-functionrange .luckysheet-formula-functionrange-highlight").remove();
        $("#luckysheet-input-box").removeAttr("style");
        $("#luckysheet-input-box-index").hide();
        $("#luckysheet-wa-functionbox-cancel, #luckysheet-wa-functionbox-confirm").removeClass("luckysheet-wa-calculate-active");
        
        _this.rangestart = false;
        _this.rangedrag_column_start = false;
        _this.rangedrag_row_start = false;
    },
    canceFunctionrangeSelected: function() {
        $("#luckysheet-formula-functionrange-select").hide();
        $("#luckysheet-row-count-show, #luckysheet-column-count-show").hide();
        // $("#luckysheet-cols-h-selected, #luckysheet-rows-h-selected").hide();
        $("#luckysheet-formula-search-c, #luckysheet-formula-help-c").hide();
    },
    iscellformat: function(txt) {
        let re_abc = /[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ][123456789]/;
    },
    iscelldata: function(txt) { //判断是否为单元格格式
        let val = txt.split("!"),
            rangetxt;

        if (val.length > 1) {
            rangetxt = val[1];
        } 
        else {
            rangetxt = val[0];
        }

        let reg_cell = /^(([a-zA-Z]+)|([$][a-zA-Z]+))(([0-9]+)|([$][0-9]+))$/g; //增加正则判断单元格为字母+数字的格式：如 A1:B3
        let reg_cellRange = /^(((([a-zA-Z]+)|([$][a-zA-Z]+))(([0-9]+)|([$][0-9]+)))|((([a-zA-Z]+)|([$][a-zA-Z]+))))$/g; //增加正则判断单元格为字母+数字或字母的格式：如 A1:B3，A:A
        
        if (rangetxt.indexOf(":") == -1) {
            let row = parseInt(rangetxt.replace(/[^0-9]/g, "")) - 1;
            let col = ABCatNum(rangetxt.replace(/[^A-Za-z]/g, ""));
            
            if (!isNaN(row) && !isNaN(col) && rangetxt.toString().match(reg_cell)) {
                return true;
            } 
            else if (!isNaN(row)) {
                return false;
            } 
            else if (!isNaN(col)) {
                return false;
            } 
            else {
                return false;
            }
        } 
        else {
            reg_cellRange = /^(((([a-zA-Z]+)|([$][a-zA-Z]+))(([0-9]+)|([$][0-9]+)))|((([a-zA-Z]+)|([$][a-zA-Z]+)))|((([0-9]+)|([$][0-9]+s))))$/g;

            rangetxt = rangetxt.split(":");

            let row = [],col = [];
            row[0] = parseInt(rangetxt[0].replace(/[^0-9]/g, "")) - 1;
            row[1] = parseInt(rangetxt[1].replace(/[^0-9]/g, "")) - 1;
            if (row[0] > row[1]) {
                return false;
            }

            col[0] = ABCatNum(rangetxt[0].replace(/[^A-Za-z]/g, ""));
            col[1] = ABCatNum(rangetxt[1].replace(/[^A-Za-z]/g, ""));
            if (col[0] > col[1]) {
                return false;
            }

            if(rangetxt[0].toString().match(reg_cellRange) && rangetxt[1].toString().match(reg_cellRange)){
                return true;
            }
            else{
                return false;
            }
        }
    },
    operator: '==|!=|<>|<=|>=|=|+|-|>|<|/|*|%|&|^',
    operatorjson: null,
    functionCopy: function(txt, mode, step) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (mode == null) {
            mode = "down";
        }

        if (step == null) {
            step = 1;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;
        
        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0
        };

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0) {
                matchConfig.bracket += 1;

                if (str.length > 0) {
                    function_str += str + "(";
                } 
                else {
                    function_str += "(";
                }

                str = "";
            } 
            else if (s == ")" && matchConfig.dquote == 0) {
                matchConfig.bracket -= 1;
                function_str += _this.functionCopy(str, mode, step) + ")";
                str = "";
            }
            else if (s == '"' && matchConfig.squote == 0) {
                if (matchConfig.dquote > 0) {
                    function_str += str + '"';
                    matchConfig.dquote -= 1;
                    str = "";
                } 
                else {
                    matchConfig.dquote += 1;
                    str += '"';
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0) {
                function_str += _this.functionCopy(str, mode, step) + ',';
                str = "";
            } 
            else if (s == '&' && matchConfig.dquote == 0) {
                if (str.length > 0) {
                    function_str += _this.functionCopy(str, mode, step) + "&";
                    str = "";
                } 
                else {
                    function_str += "&";
                }
            } 
            else if (s in _this.operatorjson && matchConfig.dquote == 0) {
                let s_next = "";

                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                let p = i - 1, 
                    s_pre = null;

                if(p >= 0){
                    do {
                        s_pre = funcstack[p--];
                    }
                    while (p>=0 && s_pre ==" ")
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (str.length > 0) {
                        function_str += _this.functionCopy(str, mode, step) + s + s_next;
                        str = "";
                    } 
                    else {
                        function_str += s + s_next;
                    }

                    i++;
                }
                else if(!(/[^0-9]/.test(s_next)) && s=="-" && (s_pre=="(" || s_pre == null || s_pre == "," || s_pre == " " || s_pre in _this.operatorjson ) ){
                    str += s;
                }
                else {
                    if (str.length > 0) {
                        function_str += _this.functionCopy(str, mode, step) + s;
                        str = "";
                    } 
                    else {
                        function_str += s;
                    }
                }
            } 
            else {
                str += s;
            }

            if (i == funcstack.length - 1) {
                if (_this.iscelldata($.trim(str))) {
                    if (mode == "down") {
                        function_str += _this.downparam($.trim(str), step);
                    } 
                    else if (mode == "up") {
                        function_str += _this.upparam($.trim(str), step);
                    } 
                    else if (mode == "left") {
                        function_str += _this.leftparam($.trim(str), step);
                    } 
                    else if (mode == "right") {
                        function_str += _this.rightparam($.trim(str), step);
                    }
                } 
                else {
                    function_str += $.trim(str);
                }
            }
            
            i++;
        }

        return function_str;
    },
    isfreezonFuc: function(txt) {
        let row = txt.replace(/[^0-9]/g, "");
        let col = txt.replace(/[^A-Za-z]/g, "");
        let row$ = txt.substr(txt.indexOf(row) - 1, 1);
        let col$ = txt.substr(txt.indexOf(col) - 1, 1);
        let ret = [false, false];

        if (row$ == "$") {
            ret[0] = true;
        }
        if (col$ == "$") {
            ret[1] = true;
        }

        return ret;
    },
    setfreezonFuceExe: function(rangetxt) {
        let row = parseInt(rangetxt.replace(/[^0-9]/g, ""));
        let col = ABCatNum(rangetxt.replace(/[^A-Za-z]/g, ""));
        let $row = "$",
            $col = "$";

        if (!isNaN(row) && !isNaN(col)) {
            return $col + chatatABC(col) + $row + (row);
        } 
        else if (!isNaN(row)) {
            return $row + (row);
        } 
        else if (!isNaN(col)) {
            return $col + chatatABC(col);
        } 
        else {
            return rangetxt;
        }
    },
    setfreezonFuc: function(event) {
        let _this = this;

        let obj = _this.getrangeseleciton();
        if (!_this.iscelldata(obj.text())) {
            return;
        }

        let txt = obj.text(),
            pos = window.getSelection().anchorOffset;
        let val = txt.split("!"),
            rangetxt, prefix = "";
        
        if (val.length > 1) {
            rangetxt = val[1];
            prefix = val[0] + "!";
        } 
        else {
            rangetxt = val[0];
        }

        let newtxt = "",
            newpos = "";
        let rangetxtIndex = rangetxt.indexOf(":");
        
        if (rangetxtIndex == -1) {
            newtxt = prefix + _this.setfreezonFuceExe(rangetxt);
            newpos = newtxt.length;
        } 
        else {
            rangetxt = rangetxt.split(":");
            
            if (pos > rangetxtIndex) {
                let ret = prefix + rangetxt[0] + ":" + _this.setfreezonFuceExe(rangetxt[1]);
                newtxt = ret;
                newpos = ret.length;
            } 
            else {
                let firsttxt = prefix + _this.setfreezonFuceExe(rangetxt[0]);
                let ret = firsttxt + ":" + rangetxt[1];
                newtxt = ret;
                newpos = firsttxt.length;
            }
        }

        obj.text(prefix + newtxt);
        _this.setCaretPosition(obj.get(0), 0, newpos);
    },
    updateparam: function(orient, txt, step) {
        let _this = this;

        let val = txt.split("!"),
            rangetxt, prefix = "";
        
        if (val.length > 1) {
            rangetxt = val[1];
            prefix = val[0] + "!";
        } 
        else {
            rangetxt = val[0];
        }

        if (rangetxt.indexOf(":") == -1) {
            let row = parseInt(rangetxt.replace(/[^0-9]/g, ""));
            let col = ABCatNum(rangetxt.replace(/[^A-Za-z]/g, ""));
            let freezonFuc = _this.isfreezonFuc(rangetxt);
            let $row = freezonFuc[0] ? "$" : "",
                $col = freezonFuc[1] ? "$" : "";
            
            if (orient == "u" && !freezonFuc[0]) {
                row -= step;
            } 
            else if (orient == "r" && !freezonFuc[1]) {
                col += step;
            } 
            else if (orient == "l" && !freezonFuc[1]) {
                col -= step;
            } 
            else if (!freezonFuc[0]) {
                row += step;
            }

            if(row[0] < 0 || col[0] < 0){
                return _this.error.r;
            }
            
            if (!isNaN(row) && !isNaN(col)) {
                return prefix + $col + chatatABC(col) + $row + (row);
            } 
            else if (!isNaN(row)) {
                return prefix + $row + (row);
            } 
            else if (!isNaN(col)) {
                return prefix + $col + chatatABC(col);
            } 
            else {
                return txt;
            }
        } 
        else {
            rangetxt = rangetxt.split(":");
            let row = [],
                col = [];

            row[0] = parseInt(rangetxt[0].replace(/[^0-9]/g, ""));
            row[1] = parseInt(rangetxt[1].replace(/[^0-9]/g, ""));
            if (row[0] > row[1]) {
                return txt;
            }
            
            col[0] = ABCatNum(rangetxt[0].replace(/[^A-Za-z]/g, ""));
            col[1] = ABCatNum(rangetxt[1].replace(/[^A-Za-z]/g, ""));
            if (col[0] > col[1]) {
                return txt;
            }

            let freezonFuc0 = _this.isfreezonFuc(rangetxt[0]);
            let freezonFuc1 = _this.isfreezonFuc(rangetxt[1]);
            let $row0 = freezonFuc0[0] ? "$" : "",
                $col0 = freezonFuc0[1] ? "$" : "";
            let $row1 = freezonFuc1[0] ? "$" : "",
                $col1 = freezonFuc1[1] ? "$" : "";
            
            if (orient == "u") {
                if (!freezonFuc0[0]) {
                    row[0] -= step;
                }

                if (!freezonFuc1[0]) {
                    row[1] -= step;
                }
            } 
            else if (orient == "r") {
                if (!freezonFuc0[1]) {
                    col[0] += step;
                }

                if (!freezonFuc1[1]) {
                    col[1] += step;
                }
            } 
            else if (orient == "l") {
                if (!freezonFuc0[1]) {
                    col[0] -= step;
                }

                if (!freezonFuc1[1]) {
                    col[1] -= step;
                }
            } 
            else {
                if (!freezonFuc0[0]) {
                    row[0] += step;
                }

                if (!freezonFuc1[0]) {
                    row[1] += step;
                }
            }

            if(row[0] < 0 || col[0] < 0){
                return _this.error.r;
            }

            if (isNaN(col[0]) && isNaN(col[1])) {
                return prefix + $row0 + (row[0]) + ":" + $row1 + (row[1]);
            } 
            else if (isNaN(row[0]) && isNaN(row[1])) {
                return prefix + $col0 + chatatABC(col[0]) + ":" + $col1 + chatatABC(col[1]);
            } 
            else {
                return prefix + $col0 + chatatABC(col[0]) + $row0 + (row[0]) + ":" + $col1 + chatatABC(col[1]) + $row1 + (row[1]);
            }
        }
    },
    downparam: function(txt, step) {
        return this.updateparam("d", txt, step);
    },
    upparam: function(txt, step) {
        return this.updateparam("u", txt, step);
    },
    leftparam: function(txt, step) {
        return this.updateparam("l", txt, step);
    },
    rightparam: function(txt, step) {
        return this.updateparam("r", txt, step);
    },
    functionStrChange: function(txt, type, rc, orient, stindex, step) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;
        
        let matchConfig = {
            "bracket": 0, //括号
            "comma": 0, //逗号
            "squote": 0, //单引号
            "dquote": 0 //双引号
        };

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0) {
                matchConfig.bracket += 1;

                if (str.length > 0) {
                    function_str += str + "(";
                } 
                else {
                    function_str += "(";
                }

                str = "";
            } 
            else if (s == ")" && matchConfig.dquote == 0) {
                matchConfig.bracket -= 1;
                function_str += _this.functionStrChange(str, type, rc, orient, stindex, step) + ")";
                str = "";
            }
            else if (s == '"' && matchConfig.squote == 0) {
                if (matchConfig.dquote > 0) {
                    function_str += str + '"';
                    matchConfig.dquote -= 1;
                    str = "";
                } 
                else {
                    matchConfig.dquote += 1;
                    str += '"';
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0) {
                function_str += _this.functionStrChange(str, type, rc, orient, stindex, step) + ',';
                str = "";
            } 
            else if (s == '&' && matchConfig.dquote == 0) {
                if (str.length > 0) {
                    function_str += _this.functionStrChange(str, type, rc, orient, stindex, step) + "&";
                    str = "";
                } 
                else {
                    function_str += "&";
                }
            } 
            else if (s in _this.operatorjson && matchConfig.dquote == 0) {
                let s_next = "";

                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                let p = i - 1, 
                    s_pre = null;;
                
                if(p >= 0){
                    do {
                        s_pre = funcstack[p--];
                    }
                    while (p>=0 && s_pre ==" ")
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (str.length > 0) {
                        function_str += _this.functionStrChange(str, type, rc, orient, stindex, step) + s + s_next;
                        str = "";
                    } 
                    else {
                        function_str += s + s_next;
                    }

                    i++;
                }
                else if(!(/[^0-9]/.test(s_next)) && s=="-" && (s_pre=="(" || s_pre == null || s_pre == "," || s_pre == " " || s_pre in _this.operatorjson ) ){
                    str += s;
                }
                else {
                    if (str.length > 0) {
                        function_str += _this.functionStrChange(str, type, rc, orient, stindex, step) + s;
                        str = "";
                    } 
                    else {
                        function_str += s;
                    }
                }
            } 
            else {
                str += s;
            }

            if (i == funcstack.length - 1) {
                if (_this.iscelldata($.trim(str))) {
                    function_str += _this.functionStrChange_range($.trim(str), type, rc, orient, stindex, step);
                } 
                else {
                    function_str += $.trim(str);
                }
            }
            
            i++;
        }

        return function_str;
    },
    functionStrChange_range: function(txt, type, rc, orient, stindex, step){
        let _this = this;

        let val = txt.split("!"),
            rangetxt, prefix = "";
        
        if (val.length > 1) {
            rangetxt = val[1];
            prefix = val[0] + "!";
        } 
        else {
            rangetxt = val[0];
        }

        let r1, r2, c1, c2;
        let $row0, $row1, $col0, $col1;

        if (rangetxt.indexOf(":") == -1) {
            r1 = r2 = parseInt(rangetxt.replace(/[^0-9]/g, "")) - 1;
            c1 = c2 = ABCatNum(rangetxt.replace(/[^A-Za-z]/g, ""));
            
            let freezonFuc = _this.isfreezonFuc(rangetxt);
            
            $row0 = $row1 = freezonFuc[0] ? "$" : "",
            $col0 = $col1 = freezonFuc[1] ? "$" : "";
        } 
        else {
            rangetxt = rangetxt.split(":");
            
            r1 = parseInt(rangetxt[0].replace(/[^0-9]/g, "")) - 1;
            r2 = parseInt(rangetxt[1].replace(/[^0-9]/g, "")) - 1;
            if (r1 > r2) {
                return txt;
            }
            
            c1 = ABCatNum(rangetxt[0].replace(/[^A-Za-z]/g, ""));
            c2 = ABCatNum(rangetxt[1].replace(/[^A-Za-z]/g, ""));
            if (c1 > c2) {
                return txt;
            }

            let freezonFuc0 = _this.isfreezonFuc(rangetxt[0]);
            $row0 = freezonFuc0[0] ? "$" : "";
            $col0 = freezonFuc0[1] ? "$" : "";

            let freezonFuc1 = _this.isfreezonFuc(rangetxt[1]);
            $row1 = freezonFuc1[0] ? "$" : "";
            $col1 = freezonFuc1[1] ? "$" : "";
        }

        if(type == "del"){
            if(rc == "row"){
                if(r1 >= stindex && r2 <= stindex + step - 1){
                    return _this.error.r;
                }
                
                if(r1 > stindex + step - 1){
                    r1 -= step;
                }
                else if(r1 >= stindex){
                    r1 = stindex;
                }

                if(r2 > stindex + step - 1){
                    r2 -= step;
                }
                else if(r2 >= stindex){
                    r2 = stindex - 1;
                }

                if(r1 < 0){
                    r1 = 0;
                }

                if(r2 < r1){
                    r2 = r1;
                }
            }
            else if(rc == "col"){
                if(c1 >= stindex && c2 <= stindex + step - 1){
                    return _this.error.r;
                }
                
                if(c1 > stindex + step - 1){
                    c1 -= step;
                }
                else if(c1 >= stindex){
                    c1 = stindex;
                }

                if(c2 > stindex + step - 1){
                    c2 -= step;
                }
                else if(c2 >= stindex){
                    c2 = stindex - 1;
                }

                if(c1 < 0){
                    c1 = 0;
                }

                if(c2 < c1){
                    c2 = c1;
                }
            }

            if(r1 == r2 && c1 == c2){
                if (!isNaN(r1) && !isNaN(c1)) {
                    return prefix + $col0 + chatatABC(c1) + $row0 + (r1 + 1);
                } 
                else if (!isNaN(r1)) {
                    return prefix + $row0 + (r1 + 1);
                } 
                else if (!isNaN(c1)) {
                    return prefix + $col0 + chatatABC(c1);
                } 
                else {
                    return txt;
                }
            }
            else{
                if (isNaN(c1) && isNaN(c2)) {
                    return prefix + $row0 + (r1 + 1) + ":" + $row1 + (r2 + 1);
                } 
                else if (isNaN(r1) && isNaN(r2)) {
                    return prefix + $col0 + chatatABC(c1) + ":" + $col1 + chatatABC(c2);
                } 
                else {
                    return prefix + $col0 + chatatABC(c1) + $row0 + (r1 + 1) + ":" + $col1 + chatatABC(c2) + $row1 + (r2 + 1);
                }
            }
        }
        else if(type == "add"){
            if(rc == "row"){
                if(orient == "lefttop"){
                    if(r1 >= stindex){
                        r1 += step;
                    }
                    
                    if(r2 >= stindex){
                        r2 += step;
                    }
                }
                else if(orient == "rightbottom"){
                    if(r1 > stindex){
                        r1 += step;
                    }

                    if(r2 > stindex){
                        r2 += step;
                    }
                }
            }
            else if(rc == "col"){
                if(orient == "lefttop"){
                    if(c1 >= stindex){
                        c1 += step;
                    }
                    
                    if(c2 >= stindex){
                        c2 += step;
                    }
                }
                else if(orient == "rightbottom"){
                    if(c1 > stindex){
                        c1 += step;
                    }

                    if(c2 > stindex){
                        c2 += step;
                    }
                }
            }

            if(r1 == r2 && c1 == c2){
                if (!isNaN(r1) && !isNaN(c1)) {
                    return prefix + $col0 + chatatABC(c1) + $row0 + (r1 + 1);
                } 
                else if (!isNaN(r1)) {
                    return prefix + $row0 + (r1 + 1);
                } 
                else if (!isNaN(c1)) {
                    return prefix + $col0 + chatatABC(c1);
                } 
                else {
                    return txt;
                }
            }
            else{
                if (isNaN(c1) && isNaN(c2)) {
                    return prefix + $row0 + (r1 + 1) + ":" + $row1 + (r2 + 1);
                } 
                else if (isNaN(r1) && isNaN(r2)) {
                    return prefix + $col0 + chatatABC(c1) + ":" + $col1 + chatatABC(c2);
                } 
                else {
                    return prefix + $col0 + chatatABC(c1) + $row0 + (r1 + 1) + ":" + $col1 + chatatABC(c2) + $row1 + (r2 + 1);
                }
            }
        }
    },
    israngeseleciton: function(istooltip) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (istooltip == null) {
            istooltip = false;
        }

        let currSelection = window.getSelection();
        let anchor = $(currSelection.anchorNode);
        let anchorOffset = currSelection.anchorOffset;

        if (anchor.parent().is("span") && anchorOffset != 0) {
            let txt = $.trim(anchor.text()),
                lasttxt = "";

            if (txt.length == 0 && anchor.parent().prev().length > 0) {
                let ahr = anchor.parent().prev();
                txt = $.trim(ahr.text());
                lasttxt = txt.substr(txt.length - 1, 1);
                _this.rangeSetValueTo = ahr;
            } 
            else {
                lasttxt = txt.substr(anchorOffset - 1, 1);
                _this.rangeSetValueTo = anchor.parent();
            }

            if ((istooltip && (lasttxt == "(" || lasttxt == ",")) || (!istooltip && (lasttxt == "(" || lasttxt == "," || lasttxt == "=" || lasttxt in _this.operatorjson || lasttxt == "&"))) {
                return true;
            }
        } 
        else if (anchor.is("#luckysheet-rich-text-editor") || anchor.is("#luckysheet-functionbox-cell")) {
            let txt = $.trim(anchor.find("span").last().text()),
                lasttxt;

            _this.rangeSetValueTo = anchor.find("span").last();

            if (txt.length == 0 && anchor.find("span").length > 1) {
                let ahr = anchor.find("span");
                txt = $.trim(ahr.eq(ahr.length - 2).text());
                _this.rangeSetValueTo = ahr;
            }

            lasttxt = txt.substr(txt.length - 1, 1);

            if ((istooltip && (lasttxt == "(" || lasttxt == ",")) || (!istooltip && (lasttxt == "(" || lasttxt == "," || lasttxt == "=" || lasttxt in _this.operatorjson || lasttxt == "&"))) {
                return true;
            }
        } 
        else if (anchor.parent().is("#luckysheet-rich-text-editor") || anchor.parent().is("#luckysheet-functionbox-cell") || anchorOffset == 0) {
            if (anchorOffset == 0) {
                anchor = anchor.parent();
            }

            if (anchor.prev().length > 0) {
                let txt = $.trim(anchor.prev().text());
                let lasttxt = txt.substr(txt.length - 1, 1);

                _this.rangeSetValueTo = anchor.prev();

                if ((istooltip && (lasttxt == "(" || lasttxt == ",")) || (!istooltip && (lasttxt == "(" || lasttxt == "," || lasttxt == "=" || lasttxt in _this.operatorjson || lasttxt == "&"))) {
                    return true;
                }
            }
        }

        return false;
    },
    rangechangeindex: null,
    rangestart: false,
    rangetosheet: null,
    rangeSetValueTo: null,
    func_selectedrange: {}, //函数选区范围
    rangeSetValue: function(selected, obj) {
        let _this = this;

        let range="", rf = selected["row"][0], cf = selected["column"][0];
        if(Store.config["merge"] != null && (rf + "_" + cf) in Store.config["merge"]){
            range = getRangetxt(Store.currentSheetIndex, {
                column:[cf, cf],
                row:[rf, rf],
            }, _this.rangetosheet);
        }
        else{
            range = getRangetxt(Store.currentSheetIndex, selected, _this.rangetosheet);
        }
        
        let $editor;

        if (_this.rangestart || _this.rangedrag_column_start || _this.rangedrag_row_start) {
            if($("#luckysheet-search-formula-parm").is(":visible")||$("#luckysheet-search-formula-parm-select").is(":visible")){
                //公式参数框选取范围
                $editor = $("#luckysheet-rich-text-editor");
                $("#luckysheet-search-formula-parm-select-input").val(range);
                $("#luckysheet-search-formula-parm .parmBox").eq(_this.data_parm_index).find(".txt input").val(range);
                
                //参数对应值显示
                let txtdata = luckysheet_getcelldata(range).data;
                if(txtdata instanceof Array){
                    //参数为多个单元格选区
                    let txtArr=[];

                    for(let i = 0; i < txtdata.length; i++){
                        for(let j = 0; j < txtdata[i].length; j++){
                            if(txtdata[i][j] == null){
                                txtArr.push(null);
                            }
                            else{
                                txtArr.push(txtdata[i][j].v);
                            }
                        }
                    }

                    $("#luckysheet-search-formula-parm .parmBox").eq(_this.data_parm_index).find(".val").text(" = {"+ txtArr.join(",") +"}");
                }
                else{
                    //参数为单个单元格选区
                    $("#luckysheet-search-formula-parm .parmBox").eq(_this.data_parm_index).find(".val").text(" = {"+ txtdata.v +"}");
                }

                //计算结果显示
                let isVal = true; //参数不为空
                let parmValArr = []; //参数值集合
                let lvi = -1; //最后一个有值的参数索引
                $("#luckysheet-search-formula-parm .parmBox").each(function(i, e){
                    let parmtxt = $(e).find(".txt input").val();
                    if(parmtxt == "" && $(e).find(".txt input").attr("data_parm_require") == "m"){
                        isVal = false;
                    }
                    if(parmtxt != ""){
                        lvi = i;
                    }
                })

                //单元格显示
                let functionHtmlTxt;
                if(lvi == -1){
                    functionHtmlTxt = "=" + $("#luckysheet-search-formula-parm .luckysheet-modal-dialog-title-text").text() + "()"; 
                }
                else if(lvi == 0){
                    functionHtmlTxt = "=" + $("#luckysheet-search-formula-parm .luckysheet-modal-dialog-title-text").text() + "(" + $("#luckysheet-search-formula-parm .parmBox").eq(0).find(".txt input").val() + ")"; 
                }
                else{
                    for(let j = 0; j <= lvi; j++){
                        parmValArr.push($("#luckysheet-search-formula-parm .parmBox").eq(j).find(".txt input").val());
                    }
                    functionHtmlTxt = "=" + $("#luckysheet-search-formula-parm .luckysheet-modal-dialog-title-text").text() + "(" + parmValArr.join(",") + ")";    
                }

                let function_str = _this.functionHTMLGenerate(functionHtmlTxt);
                $("#luckysheet-rich-text-editor").html(function_str);
                $("#luckysheet-functionbox-cell").html($("#luckysheet-rich-text-editor").html());
                
                if(isVal){
                    //公式计算
                    let fp = $.trim(_this.functionParser($("#luckysheet-rich-text-editor").text()));
                    let result = eval(fp);
                    $("#luckysheet-search-formula-parm .result span").text(result);
                }
            }
            else{
                let currSelection = window.getSelection();
                let anchorOffset = currSelection.anchorNode;
                $editor = $(anchorOffset).closest("div");

                let $span = $editor.find("span[rangeindex='" + _this.rangechangeindex + "']").html(range);

                _this.setCaretPosition($span.get(0), 0, range.length);
            }
        } 
        else {
            let function_str = '<span class="luckysheet-formula-functionrange-cell" rangeindex="' + _this.functionHTMLIndex + '" dir="auto" style="color:' + luckyColor[_this.functionHTMLIndex] + ';">' + range + '</span>';
            let $t = $(function_str).insertAfter(_this.rangeSetValueTo);
            _this.rangechangeindex = _this.functionHTMLIndex;
            $editor = $(_this.rangeSetValueTo).closest("div");

            _this.setCaretPosition($editor.find("span[rangeindex='" + _this.rangechangeindex + "']").get(0), 0, range.length);
            _this.functionHTMLIndex++;
        }

        if ($editor.attr("id") == "luckysheet-rich-text-editor") {
            $("#luckysheet-functionbox-cell").html($("#luckysheet-rich-text-editor").html());
        } 
        else {
            $("#luckysheet-rich-text-editor").html($("#luckysheet-functionbox-cell").html());
        }
    },
    rangedrag: function(event) {
        let _this = this;

        let mouse = mouseposition(event.pageX, event.pageY);
        let x = mouse[0] + $("#luckysheet-cell-main").scrollLeft();
        let y = mouse[1] + $("#luckysheet-cell-main").scrollTop();
        
        let row_location = rowLocation(y),
            row = row_location[1],
            row_pre = row_location[0],
            row_index = row_location[2];

        let col_location = colLocation(x),
            col = col_location[1],
            col_pre = col_location[0],
            col_index = col_location[2];

        let top = 0,
            height = 0,
            rowseleted = [];

        if (_this.func_selectedrange.top > row_pre) {
            top = row_pre;
            height = _this.func_selectedrange.top + _this.func_selectedrange.height - row_pre;
            rowseleted = [row_index, _this.func_selectedrange.row[1]];
        } 
        else if (_this.func_selectedrange.top == row_pre) {
            top = row_pre;
            height = _this.func_selectedrange.top + _this.func_selectedrange.height - row_pre;
            rowseleted = [row_index, _this.func_selectedrange.row[0]];
        } 
        else {
            top = _this.func_selectedrange.top;
            height = row - _this.func_selectedrange.top - 1;
            rowseleted = [_this.func_selectedrange.row[0], row_index];
        }

        let left = 0,
            width = 0,
            columnseleted = [];

        if (_this.func_selectedrange.left > col_pre) {
            left = col_pre;
            width = _this.func_selectedrange.left + _this.func_selectedrange.width - col_pre;
            columnseleted = [col_index, _this.func_selectedrange.column[1]];
        } 
        else if (_this.func_selectedrange.left == col_pre) {
            left = col_pre;
            width = _this.func_selectedrange.left + _this.func_selectedrange.width - col_pre;
            columnseleted = [col_index, _this.func_selectedrange.column[0]];
        } 
        else {
            left = _this.func_selectedrange.left;
            width = col - _this.func_selectedrange.left - 1;
            columnseleted = [_this.func_selectedrange.column[0], col_index];
        }

        rowseleted[0] = luckysheetFreezen.changeFreezenIndex(rowseleted[0], "h");
        rowseleted[1] = luckysheetFreezen.changeFreezenIndex(rowseleted[1], "h");
        columnseleted[0] = luckysheetFreezen.changeFreezenIndex(columnseleted[0], "v");
        columnseleted[1] = luckysheetFreezen.changeFreezenIndex(columnseleted[1], "v");

        let changeparam = menuButton.mergeMoveMain(columnseleted, rowseleted, _this.func_selectedrange, top , height, left , width);
        if(changeparam != null){
            columnseleted = changeparam[0];
            rowseleted= changeparam[1];
            top = changeparam[2];
            height = changeparam[3];
            left = changeparam[4];
            width = changeparam[5];
        }

        _this.func_selectedrange["row"] = rowseleted;
        _this.func_selectedrange["column"] = columnseleted;

        _this.func_selectedrange["left_move"] = left;
        _this.func_selectedrange["width_move"] = width;
        _this.func_selectedrange["top_move"] = top;
        _this.func_selectedrange["height_move"] = height;

        luckysheet_count_show(left, top, width, height, rowseleted, columnseleted);

        $("#luckysheet-formula-functionrange-select").css({
            "left": left,
            "width": width,
            "top": top,
            "height": height
        }).show();

        if($("#luckysheet-ifFormulaGenerator-multiRange-dialog").is(":visible")){
            //if公式生成器 选择范围
            let range = getRangetxt(Store.currentSheetIndex, { "row": rowseleted, "column": columnseleted }, Store.currentSheetIndex);
            $("#luckysheet-ifFormulaGenerator-multiRange-dialog input").val(range);
        }
        else{
            _this.rangeSetValue({
                "row": rowseleted,
                "column": columnseleted
            }); 
        }
        
        luckysheetFreezen.scrollFreezen(rowseleted, columnseleted);
    },
    rangedrag_column_start: false,
    rangedrag_row_start: false,
    rangedrag_column: function(event) {
        let _this = this;

        let mouse = mouseposition(event.pageX, event.pageY);
        let x = mouse[0] + $("#luckysheet-cell-main").scrollLeft();
        let y = mouse[1] + $("#luckysheet-cell-main").scrollTop();
        
        let visibledatarow = Store.visibledatarow;
        let row_index = visibledatarow.length - 1,
            row = visibledatarow[row_index],
            row_pre = 0;

        let col_location = colLocation(x),
            col = col_location[1],
            col_pre = col_location[0],
            col_index = col_location[2];

        let left = 0,
            width = 0,
            columnseleted = [];

        if (_this.func_selectedrange.left > col_pre) {
            left = col_pre;
            width = _this.func_selectedrange.left + _this.func_selectedrange.width - col_pre;
            columnseleted = [col_index, _this.func_selectedrange.column[1]];
        } 
        else if (_this.func_selectedrange.left == col_pre) {
            left = col_pre;
            width = _this.func_selectedrange.left + _this.func_selectedrange.width - col_pre;
            columnseleted = [col_index, _this.func_selectedrange.column[0]];
        } 
        else {
            left = _this.func_selectedrange.left;
            width = col - _this.func_selectedrange.left - 1;
            columnseleted = [_this.func_selectedrange.column[0], col_index];
        }

        //rowseleted[0] = luckysheetFreezen.changeFreezenIndex(rowseleted[0], "h");
        //rowseleted[1] = luckysheetFreezen.changeFreezenIndex(rowseleted[1], "h");
        columnseleted[0] = luckysheetFreezen.changeFreezenIndex(columnseleted[0], "v");
        columnseleted[1] = luckysheetFreezen.changeFreezenIndex(columnseleted[1], "v");

        let changeparam = menuButton.mergeMoveMain(columnseleted, [0, row_index], _this.func_selectedrange, row_pre , row - row_pre - 1, left , width);
        if(changeparam != null){
            columnseleted = changeparam[0];
            // rowseleted= changeparam[1];
            // top = changeparam[2];
            // height = changeparam[3];
            left = changeparam[4];
            width = changeparam[5];
        }

        _this.func_selectedrange["column"] = columnseleted;
        _this.func_selectedrange["left_move"] = left;
        _this.func_selectedrange["width_move"] = width;

        luckysheet_count_show(left, row_pre, width, row - row_pre - 1, [0, row_index], columnseleted);

        _this.rangeSetValue({
            "row": [null, null],
            "column": columnseleted
        });

        $("#luckysheet-formula-functionrange-select").css({
            "left": left,
            "width": width,
            "top": row_pre,
            "height": row - row_pre - 1
        }).show();
        
        luckysheetFreezen.scrollFreezen([0, row_index], columnseleted);
    },
    rangedrag_row: function(event) {
        let _this = this;

        let mouse = mouseposition(event.pageX, event.pageY);
        let x = mouse[0] + $("#luckysheet-cell-main").scrollLeft();
        let y = mouse[1] + $("#luckysheet-cell-main").scrollTop();

        let row_location = rowLocation(y),
            row = row_location[1],
            row_pre = row_location[0],
            row_index = row_location[2];

        let visibledatacolumn = Store.visibledatacolumn;
        let col_index = visibledatacolumn.length - 1,
            col = visibledatacolumn[col_index],
            col_pre = 0;
        
        let top = 0,
            height = 0,
            rowseleted = [];

        if (_this.func_selectedrange.top > row_pre) {
            top = row_pre;
            height = _this.func_selectedrange.top + _this.func_selectedrange.height - row_pre;
            rowseleted = [row_index, _this.func_selectedrange.row[1]];
        } 
        else if (_this.func_selectedrange.top == row_pre) {
            top = row_pre;
            height = _this.func_selectedrange.top + _this.func_selectedrange.height - row_pre;
            rowseleted = [row_index, _this.func_selectedrange.row[0]];
        } 
        else {
            top = _this.func_selectedrange.top;
            height = row - _this.func_selectedrange.top - 1;
            rowseleted = [_this.func_selectedrange.row[0], row_index];
        }

        rowseleted[0] = luckysheetFreezen.changeFreezenIndex(rowseleted[0], "h");
        rowseleted[1] = luckysheetFreezen.changeFreezenIndex(rowseleted[1], "h");
        // columnseleted[0] = luckysheetFreezen.changeFreezenIndex(columnseleted[0], "v");
        // columnseleted[1] = luckysheetFreezen.changeFreezenIndex(columnseleted[1], "v");

        let changeparam = menuButton.mergeMoveMain([0, col_index], rowseleted, _this.func_selectedrange, top, height, col_pre, col - col_pre - 1);
        if(changeparam != null){
            // columnseleted = changeparam[0];
            rowseleted= changeparam[1];
            top = changeparam[2];
            height = changeparam[3];
            // left = changeparam[4];
            // width = changeparam[5];
        }

        _this.func_selectedrange["row"] = rowseleted;
        _this.func_selectedrange["top_move"] = top;
        _this.func_selectedrange["height_move"] = height;

        luckysheet_count_show(col_pre, top, col - col_pre - 1, height, rowseleted, [0, col_index]);

        _this.rangeSetValue({
            "row": rowseleted,
            "column": [null, null]
        });

        $("#luckysheet-formula-functionrange-select").css({
            "left": col_pre,
            "width": col - col_pre - 1,
            "top": top,
            "height": height
        }).show();

        luckysheetFreezen.scrollFreezen(rowseleted, [0, col_index]);
    },
    rangedragged: function() {},
    rangeResizeObj: null,
    rangeResize: null,
    rangeResizeIndex: null,
    rangeResizexy: null,
    rangeResizeWinH: null,
    rangeResizeWinW: null,
    rangeResizeTo: null,
    rangeResizeDraging: function(event, luckysheetCurrentChartResizeObj, luckysheetCurrentChartResizeXy, luckysheetCurrentChartResize, luckysheetCurrentChartResizeWinW, luckysheetCurrentChartResizeWinH, ch_width, rh_height) {
        let _this = this;
        
        let scrollTop = $("#luckysheet-scrollbar-y").scrollTop(),
            scrollLeft = $("#luckysheet-scrollbar-x").scrollLeft();
        let mouse = mouseposition(event.pageX, event.pageY);
        let x = mouse[0] + scrollLeft;
        let y = mouse[1] + scrollTop;

        let row_location = rowLocation(y),
            row = row_location[1],
            row_pre = row_location[0],
            row_index = row_location[2];
        let col_location = colLocation(x),
            col = col_location[1],
            col_pre = col_location[0],
            col_index = col_location[2];

        if (x < 0 || y < 0) {
            return false;
        }

        let topchange = row_pre - luckysheetCurrentChartResizeXy[1],
            leftchange = col_pre - luckysheetCurrentChartResizeXy[0];
        let top = luckysheetCurrentChartResizeXy[5],
            height = luckysheetCurrentChartResizeXy[3],
            left = luckysheetCurrentChartResizeXy[4],
            width = luckysheetCurrentChartResizeXy[2];

        if (luckysheetCurrentChartResize == "lt" || luckysheetCurrentChartResize == "lb") {
            if (luckysheetCurrentChartResizeXy[0] + luckysheetCurrentChartResizeXy[2] < col_pre) {
                return;
            }

            left = col_pre;
            width = luckysheetCurrentChartResizeXy[2] - leftchange;
            
            if (left > luckysheetCurrentChartResizeXy[2] + luckysheetCurrentChartResizeXy[4] - col + col_pre) {
                left = luckysheetCurrentChartResizeXy[2] + luckysheetCurrentChartResizeXy[4] - col + col_pre;
                width = luckysheetCurrentChartResizeXy[2] - (luckysheetCurrentChartResizeXy[2] + luckysheetCurrentChartResizeXy[4] - col + col_pre - luckysheetCurrentChartResizeXy[0]);
            } 
            else if (left <= 0) {
                left = 0;
                width = luckysheetCurrentChartResizeXy[2] + luckysheetCurrentChartResizeXy[0];
            }
        }

        if (luckysheetCurrentChartResize == "rt" || luckysheetCurrentChartResize == "rb") {
            if (luckysheetCurrentChartResizeXy[6] - luckysheetCurrentChartResizeXy[2] > col) {
                return;
            }

            width = luckysheetCurrentChartResizeXy[2] + col - luckysheetCurrentChartResizeXy[6];
            
            if (width < col - col_pre - 1) {
                width = col - col_pre - 1;
            } 
            else if (width >= ch_width - left) {
                width = ch_width - left;
            }
        }

        if (luckysheetCurrentChartResize == "lt" || luckysheetCurrentChartResize == "rt") {
            if (luckysheetCurrentChartResizeXy[1] + luckysheetCurrentChartResizeXy[3] < row_pre) {
                return;
            }

            top = row_pre;
            height = luckysheetCurrentChartResizeXy[3] - topchange;
            
            if (top > luckysheetCurrentChartResizeXy[3] + luckysheetCurrentChartResizeXy[5] - row + row_pre) {
                top = luckysheetCurrentChartResizeXy[3] + luckysheetCurrentChartResizeXy[5] - row + row_pre;
                height = luckysheetCurrentChartResizeXy[3] - (luckysheetCurrentChartResizeXy[3] + luckysheetCurrentChartResizeXy[5] - row + row_pre - luckysheetCurrentChartResizeXy[1]);
            } 
            else if (top <= 0) {
                top = 0;
                height = luckysheetCurrentChartResizeXy[3] + luckysheetCurrentChartResizeXy[1];
            }
        }

        if (luckysheetCurrentChartResize == "lb" || luckysheetCurrentChartResize == "rb") {
            if (luckysheetCurrentChartResizeXy[7] - luckysheetCurrentChartResizeXy[3] > row) {
                return;
            }

            height = luckysheetCurrentChartResizeXy[3] + row - luckysheetCurrentChartResizeXy[7];
            
            if (height < row - row_pre - 1) {
                height = row - row_pre - 1;
            } 
            else if (height >= rh_height - top) {
                height = rh_height - top;
            }
        }

        let rangeindex = _this.rangeResizeIndex;
        let selected = {
            "top": top,
            "left": left,
            "height": height,
            "width": width
        };
        let range = _this.getSelectedFromRange(selected);
        let rangetxt = getRangetxt(Store.currentSheetIndex, range, _this.rangetosheet);
        let $span = _this.rangeResizeTo.find("span[rangeindex='" + rangeindex + "']").html(rangetxt);
        luckysheetRangeLast(_this.rangeResizeTo[0]);
        luckysheetCurrentChartResizeObj.css(selected).data("range", range);
    },
    getSelectedFromRange: function(obj) {
        let row_st = obj.top + 2,
            row_ed = obj.top + obj.height - 2;
        let col_st = obj.left + 2,
            col_ed = obj.left + obj.width - 2;

        let ret = {
            "row": [
                rowLocation(row_st)[2],
                rowLocation(row_ed)[2]
            ],
            "column": [
                colLocation(col_st)[2],
                colLocation(col_ed)[2]
            ]
        };

        return ret;
    },
    rangeResizeDragged: function(event, luckysheetCurrentChartResizeObj, luckysheetCurrentChartResizeXy, luckysheetCurrentChartResize, luckysheetCurrentChartResizeWinW, luckysheetCurrentChartResizeWinH) {
        let _this = this;

        _this.rangeResize = null;
        $("#luckysheet-formula-functionrange-highlight-" + _this.rangeResizeIndex).find(".luckysheet-selection-copy-hc").css("opacity", 0.03);
    },
    rangeMovexy: null,
    rangeMove: false,
    rangeMoveObj: null,
    rangeMoveIndex: null,
    rangeMoveRangedata: null,
    rangeMoveDraging: function(event, luckysheet_cell_selected_move_index, luckysheet_select_save, obj, sheetBarHeight, statisticBarHeight) {
        let _this = this;
        
        let mouse = mouseposition(event.pageX, event.pageY);
        let scrollLeft = $("#luckysheet-scrollbar-x").scrollLeft();
        let scrollTop = $("#luckysheet-scrollbar-y").scrollTop();
        let x = mouse[0] + scrollLeft;
        let y = mouse[1] + scrollTop;

        let winH = $(window).height() + scrollTop - sheetBarHeight - statisticBarHeight,
            winW = $(window).width() + scrollLeft;

        let row_index_original = luckysheet_cell_selected_move_index[0],
            col_index_original = luckysheet_cell_selected_move_index[1];
        let row_s = luckysheet_select_save["row"][0] - row_index_original + rowLocation(y)[2],
            row_e = luckysheet_select_save["row"][1] - row_index_original + rowLocation(y)[2];
        let col_s = luckysheet_select_save["column"][0] - col_index_original + colLocation(x)[2],
            col_e = luckysheet_select_save["column"][1] - col_index_original + colLocation(x)[2];

        if (row_s < 0 || y < 0) {
            row_s = 0;
            row_e = luckysheet_select_save["row"][1] - luckysheet_select_save["row"][0];
        }
        if (col_s < 0 || x < 0) {
            col_s = 0;
            col_e = luckysheet_select_save["column"][1] - luckysheet_select_save["column"][0];
        }

        let visibledatarow = Store.visibledatarow;
        if (row_e >= visibledatarow[visibledatarow.length - 1] || y > winH) {
            row_s = visibledatarow.length - 1 - luckysheet_select_save["row"][1] + luckysheet_select_save["row"][0];
            row_e = visibledatarow.length - 1;
        }
        let visibledatacolumn = Store.visibledatacolumn;
        if (col_e >= visibledatacolumn[visibledatacolumn.length - 1] || x > winW) {
            col_s = visibledatacolumn.length - 1 - luckysheet_select_save["column"][1] + luckysheet_select_save["column"][0];
            col_e = visibledatacolumn.length - 1;
        }

        let col_pre = col_s - 1 == -1 ? 0 : visibledatacolumn[col_s - 1],
            col = visibledatacolumn[col_e];
        let row_pre = row_s - 1 == -1 ? 0 : visibledatarow[row_s - 1],
            row = visibledatarow[row_e];
        let rangeindex = _this.rangeMoveIndex;
        let selected = {
            "left": col_pre,
            "width": col - col_pre - 2,
            "top": row_pre,
            "height": row - row_pre - 2,
            "display": "block"
        };
        let range = _this.getSelectedFromRange(selected);
        let rangetxt = getRangetxt(Store.currentSheetIndex, range, _this.rangetosheet);
        let $span = _this.rangeResizeTo.find("span[rangeindex='" + rangeindex + "']").html(rangetxt);
        luckysheetRangeLast(_this.rangeResizeTo[0]);
        _this.rangeMoveRangedata = range;
        obj.css(selected);
    },
    rangeMoveDragged: function(obj) {
        let _this = this;

        _this.rangeMove = false;
        $("#luckysheet-formula-functionrange-highlight-" + _this.rangeMoveIndex).data("range", _this.rangeMoveRangedata).find(".luckysheet-selection-copy-hc").css("opacity", 0.03);
    },
    functionHTMLIndex: 0,
    functionRangeIndex: null,
    findrangeindex: function(v, vp) {
        let _this = this;

        let re = /<span.*?>/g;
        let v_a = v.replace(re, ""),
            vp_a = vp.replace(re, "");
        v_a = v_a.split('</span>');
        vp_a = vp_a.split('</span>');
        v_a.pop();
        vp_a.pop();

        let pfri = _this.functionRangeIndex;
        let i = 0;
        let spanlen = vp_a.length > v_a.length ? v_a.length : vp_a.length;

        let vplen = vp_a.length, vlen = v_a.length;
        //不增加元素输入
        if(vplen == vlen){
            let i = pfri[0];
            let p = vp_a[i], n = v_a[i];
            
            if(p == null){
                if(vp_a.length <= i){
                    pfri = [vp_a.length - 1, vp_a.length - 1];
                }
                else if(v_a.length<=i){
                    pfri = [v_a.length - 1, v_a.length - 1];
                }

                return pfri;
            }
            else if(p.length == n.length){
                if(vp_a[i + 1] != null && v_a[i + 1] != null && vp_a[i + 1].length < v_a[i + 1].length){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }

                return pfri;
            }
            else if(p.length > n.length){
                if(p != null && v_a[i + 1] != null && v_a[i + 1].substr(0,1) == '"' && (p.indexOf("{") > -1 || p.indexOf("}") > -1)){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }

                return pfri;
            }
            else if(p.length < n.length){
                if(pfri[1] > n.length){
                    pfri[1] = n.length;
                }

                return pfri;
            }
        }
        //减少元素输入
        else if(vplen > vlen){
            let i = pfri[0];
            let p = vp_a[i], n = v_a[i];

            if(n == null){
                if(v_a[i - 1].indexOf("{") > -1){
                    pfri[0] = pfri[0] -1;
                    let start = v_a[i - 1].search("{");
                    pfri[1] = pfri[1] + start;
                }
                else{
                    pfri[0] = 0;
                    pfri[1] = 0;
                }
            }
            else if(p.length == n.length){
                if(v_a[i + 1] != null && (v_a[i + 1].substr(0,1) == '"' || v_a[i + 1].substr(0,1) == '{' || v_a[i + 1].substr(0,1) == '}')){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }
                else if(p != null && p.length > 2 && p.substr(0,1) == '"' && p.substr(p.length - 1, 1) == '"' ){
                    //pfri[1] = n.length-1;
                }
                else if(v_a[i] != null && v_a[i] == '")'){
                    pfri[1] = 1;
                }
                else if(v_a[i] != null && v_a[i] == '"}'){
                    pfri[1] = 1;
                }
                else if(v_a[i] != null && v_a[i] == '{)'){
                    pfri[1] = 1;
                }
                else{
                    pfri[1] = n.length;
                }
                
                return pfri;
            }
            else if(p.length > n.length){
                if(v_a[i + 1] != null && (v_a[i + 1].substr(0,1) == '"' || v_a[i + 1].substr(0,1) == '{' || v_a[i+1].substr(0,1) == '}')){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }

                return pfri;
            }
            else if(p.length < n.length){
                return pfri;
            }
            
            return pfri;
        }
        //增加元素输入
        else if(vplen < vlen){
            let i = pfri[0];
            let p = vp_a[i], n = v_a[i];

            if(p == null){
                pfri[0] = v_a.length - 1;
                
                if(n != null){
                    pfri[1] = n.length;
                }
                else{
                    pfri[1] = 1;
                }
            }
            else if(p.length == n.length){
                if(vp_a[i + 1] != null && (vp_a[i + 1].substr(0, 1) == '"' || vp_a[i + 1].substr(0, 1) == '{' || vp_a[i + 1].substr(0, 1) == '}') ){
                    pfri[1] = n.length;
                }
                else if(v_a[i + 1] != null && v_a[i + 1].substr(0, 1) == '"' && ( v_a[i + 1].substr(0, 1) == '{' || v_a[i + 1].substr(0, 1) == '}') ){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }
                else if(n != null && n.substr(0, 1) == '"' && n.substr(n.length - 1, 1) == '"' && p.substr(0, 1) == '"' && p.substr(p.length - 1, 1) == ')'){
                    pfri[1] = n.length;
                }
                else if(n != null && n.substr(0, 1) == '{' && n.substr(n.length - 1, 1) == '}' && p.substr(0, 1) == '{' && p.substr(p.length - 1, 1) == ')'){
                    pfri[1] = n.length;
                }
                else{
                    pfri[0] = pfri[0] + vlen - vplen;
                    if(v_a.length > vp_a.length){
                        pfri[1] = v_a[i + 1].length;
                    }
                    else{
                        pfri[1] = 1;
                    }
                }

                return pfri;
            }
            else if(p.length > n.length){
                if(p != null && p.substr(0, 1) == '"'){
                    pfri[1] = n.length;
                }
                else if(v_a[i + 1] != null && /{.*?}/.test(v_a[i + 1])){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = v_a[i + 1].length;
                }
                else if(p != null && v_a[i + 1].substr(0, 1) == '"' && (p.indexOf("{") > -1 || p.indexOf("}") > -1)){
                    pfri[0] = pfri[0] + 1;
                    pfri[1] = 1;
                }
                else if(p != null && (p.indexOf("{") > -1 || p.indexOf("}") > -1)){

                }
                else{
                    pfri[0] = pfri[0] + vlen - vplen - 1;
                    pfri[1] = v_a[i - 1].length;
                }

                return pfri;
            }
            else if(p.length < n.length){
                return pfri;
            }
           
            return pfri;
        }

        return null;
    },
    setCaretPosition: function(textDom, children, pos) {
        try{
            let el = textDom;
            let range = document.createRange();
            let sel = window.getSelection();
            range.setStart(el.childNodes[children], pos);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            el.focus();
        }
        catch(err) {
            luckysheetRangeLast(this.rangeResizeTo[0]);
        }
    },
    functionRange: function(obj, v, vp) {
        let _this = this;

        if (window.getSelection) { //ie11 10 9 ff safari
            let currSelection = window.getSelection();
            let fri = _this.findrangeindex(v, vp);
            
            if (fri == null) {
                currSelection.selectAllChildren(obj.get(0));
                currSelection.collapseToEnd();
            } 
            else {
                _this.setCaretPosition(obj.find("span").get(fri[0]), 0, fri[1]);
            }
        } 
        else if (document.selection) { //ie10 9 8 7 6 5
            _this.functionRangeIndex.moveToElementText(obj); //range定位到obj
            _this.functionRangeIndex.collapse(false); //光标移至最后
            _this.functionRangeIndex.select();
        }
    },
    functionInputHanddler: function($to, $input, kcode) {
        if(isEditMode()){//此模式下禁用公式栏
            return;
        }

        let _this = this;

        let $functionbox = $to,
            $editer = $input;
        let value1 = $editer.html(),
            value1txt = $editer.text();

        setTimeout(function() {
            let value = $editer.text(),
                valuetxt = value;

            if (value.length > 0 && value.substr(0, 1) == "=" && (kcode != 229 || value.length == 1)) {
                value = _this.functionHTMLGenerate(value);
                value1 = _this.functionHTMLGenerate(value1txt);

                if (window.getSelection) { // all browsers, except IE before version 9
                    let currSelection = window.getSelection();
                    if($(currSelection.anchorNode).is("div")){
                        let editorlen = $("#luckysheet-rich-text-editor span").length;
                        _this.functionRangeIndex = [editorlen-1, $("#luckysheet-rich-text-editor").find("span").eq(editorlen-1).text().length];
                    }
                    else{
                        _this.functionRangeIndex = [$(currSelection.anchorNode).parent().index(), currSelection.anchorOffset];
                    }
                } 
                else { // Internet Explorer before version 9
                    let textRange = document.selection.createRange();
                    _this.functionRangeIndex = textRange;
                }

                $editer.html(value);
                _this.functionRange($editer, value, value1);
                _this.canceFunctionrangeSelected();

                if(kcode != 46){//delete不执行此函数
                    _this.createRangeHightlight();
                }
            }

            _this.rangestart = false;
            _this.rangedrag_column_start = false;
            _this.rangedrag_row_start = false;

            $functionbox.html(value);
            _this.rangeHightlightselected($editer, kcode);
        }, 1);
    },
    functionHTMLGenerate: function(txt) {
        let _this = this;

        if (txt.length == 0 || txt.substr(0, 1) != "=") {
            return txt;
        }

        _this.functionHTMLIndex = 0;
        
        return '<span dir="auto" class="luckysheet-formula-text-color">=</span>' + _this.functionHTML(txt);
    },
    functionHTML: function(txt) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;
        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0,
            "braces": 0
        }

        while (i < funcstack.length) {
            let s = funcstack[i];
            
            if (s == "(" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                matchConfig.bracket += 1;
                
                if (str.length > 0) {
                    function_str += '<span dir="auto" class="luckysheet-formula-text-func">' + str + '</span><span dir="auto" class="luckysheet-formula-text-lpar">(</span>';
                } 
                else {
                    function_str += '<span dir="auto" class="luckysheet-formula-text-lpar">(</span>';
                }

                str = "";
            } 
            else if (s == ")" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                matchConfig.bracket -= 1;
                function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-rpar">)</span>';
                str = "";
            }
            else if(s=="{" && matchConfig.dquote == 0) {
                str += '{';
                matchConfig.braces += 1;
            }
            else if(s=="}" && matchConfig.dquote == 0) {
                str += '}';
                matchConfig.braces -= 1;
            }
            else if (s == '"' && matchConfig.squote == 0) {
                if (matchConfig.dquote > 0) {
                    if (str.length > 0) {
                        function_str += str + '"</span>';
                    } 
                    else {
                        function_str += '"</span>';
                    }

                    matchConfig.dquote -= 1;
                    str = "";
                } 
                else {
                    matchConfig.dquote += 1;
                    
                    if (str.length > 0) {
                        function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-string">"';
                    } 
                    else {
                        function_str += '<span dir="auto" class="luckysheet-formula-text-string">"';
                    }
                    
                    str = "";
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                //matchConfig.comma += 1;
                function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-comma">,</span>';
                str = "";
            } 
            else if (s == '&' && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                if (str.length > 0) {
                    function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-calc">' + '&' + '</span>';;
                    str = "";
                } 
                else {
                    function_str += '<span dir="auto" class="luckysheet-formula-text-calc">' + '&' + '</span>';
                }
            }
            else if (s in _this.operatorjson && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                let s_next = "";
                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                let p = i-1, s_pre = null;;
                if(p >= 0){
                    do {
                        s_pre = funcstack[p--];
                    }
                    while (p >= 0 && s_pre ==" ")
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (str.length > 0) {
                        function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-calc">' + s + s_next + '</span>';
                        str = "";
                    } 
                    else {
                        function_str += '<span dir="auto" class="luckysheet-formula-text-calc">' + s + s_next + '</span>';
                    }

                    i++;
                } 
                else if(!(/[^0-9]/.test(s_next)) && s=="-" && (s_pre=="(" || s_pre == null || s_pre == "," || s_pre == " " || s_pre in _this.operatorjson ) ){
                    str += s;
                }
                else {
                    if (str.length > 0) {
                        function_str += _this.functionHTML(str) + '<span dir="auto" class="luckysheet-formula-text-calc">' + s + '</span>';
                        str = "";
                    } 
                    else {
                        function_str += '<span dir="auto" class="luckysheet-formula-text-calc">' + s + '</span>';
                    }
                }
            } 
            else {
                str += s;
            }

            if (i == funcstack.length - 1) {
                //function_str += str;
                if (_this.iscelldata($.trim(str))) {
                    function_str += '<span class="luckysheet-formula-functionrange-cell" rangeindex="' + _this.functionHTMLIndex + '" dir="auto" style="color:' + luckyColor[_this.functionHTMLIndex] + ';">' + str + '</span>';
                    _this.functionHTMLIndex++;
                } 
                else if (matchConfig.dquote > 0) {
                    function_str += str + '</span>';
                } 
                else if (str.indexOf("</span>") == -1 && str.length > 0) {
                    let regx = /{.*?}/;
                    
                    if(regx.test($.trim(str))){
                        let arraytxt = regx.exec(str)[0];
                        let arraystart = str.search(regx);
                        let alltxt = "";
                        
                        if(arraystart > 0){
                            alltxt += '<span dir="auto" class="luckysheet-formula-text-color">' + str.substr(0, arraystart) + '</span>';
                        }
                        
                        alltxt += '<span dir="auto" style="color:#959a05" class="luckysheet-formula-text-array">' + arraytxt + '</span>';

                        if(arraystart + arraytxt.length < str.length){
                            alltxt += '<span dir="auto" class="luckysheet-formula-text-color">' + str.substr(arraystart + arraytxt.length, str.length) + '</span>';
                        }

                        function_str += alltxt;
                    }
                    else{
                        function_str += '<span dir="auto" class="luckysheet-formula-text-color">' + str + '</span>';
                    }
                }
            }

            i++;
        }

        return function_str;
    },
    getfunctionParam: function(txt) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};
            
            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "";
        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0,
            "compare": 0
        }

        //bracket 0为运算符括号、1为函数括号
        let fn = null, param = [], bracket = [];

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0) {
                if (str.length > 0 && bracket.length==0) {
                    fn = str.toUpperCase();
                    bracket.push(1);
                    str = "";
                }
                else if(bracket.length==0) {
                    //function_str += "(";
                    bracket.push(0);
                    str = "";
                }
                else{
                    bracket.push(0);
                    str += s;
                }
            } 
            else if (s == ")" && matchConfig.dquote == 0) {
                let bt = bracket.pop();

                if(bracket.length == 0){
                    param.push(str);
                    str = "";
                }
                else{
                    str += s;
                }
            }
            else if (s == '"') {
                str += '"';
                
                if (matchConfig.dquote > 0) {
                    matchConfig.dquote -= 1;
                    str = "";
                } 
                else {
                    matchConfig.dquote += 1;
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0) {
                if(bracket.length <= 1){
                    param.push(str);
                    str = "";
                }
                else{
                    str += ",";
                }
            }
            else if (s in _this.operatorjson && matchConfig.dquote == 0) {
                let s_next = "";
                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                let p = i-1, s_pre = null;;
                if(p >= 0){
                    do {
                        s_pre = funcstack[p--];
                    }
                    while (p >= 0 && s_pre ==" ")
                }

                if(!(/[^0-9]/.test(s_next)) && s=="-" && (s_pre=="(" || s_pre == null || s_pre == "," || s_pre == " " || s_pre in _this.operatorjson ) ){
                    if (matchConfig.dquote == 0) {
                        str += $.trim(s);
                    } 
                    else {
                        str += s;
                    }
                }
                else{
                    function_str= "";
                    str = "";
                }
            } 
            else {
                if (matchConfig.dquote == 0) {
                    str += $.trim(s);
                } 
                else {
                    str += s;
                }
            }

            i++;
        }

        return {"fn": fn, "param": param};
    },
    functionParser1: function(txt) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;
        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0,
            "compare":0
        }

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0) {
                matchConfig.bracket += 1;
                
                if (str.length > 0) {
                    function_str += "luckysheet_function." + str.toUpperCase() + ".f(";
                } 
                else {
                    function_str += "(";
                }

                str = "";
            } 
            else if (s == ")" && matchConfig.dquote == 0) {
                matchConfig.bracket -= 1;
                function_str += _this.functionParser(str);
                
                if(matchConfig.compare == 1){
                    function_str += '))';
                    matchConfig.compare = 0;
                }
                else{
                    function_str += ')';
                }

                str = "";
            }
            else if (s == '"' && matchConfig.squote == 0) {
                if (matchConfig.dquote > 0) {
                    function_str += str + '"';
                    matchConfig.dquote -= 1;
                    str = "";
                } 
                else {
                    matchConfig.dquote += 1;
                    str += '"';
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0) {
                //matchConfig.comma += 1;
                function_str += _this.functionParser(str);
                
                if(matchConfig.compare == 1){
                    function_str += '),';
                    matchConfig.compare = 0;
                }
                else{
                    function_str += ',';
                }

                str = "";
            } 
            else if (s in _this.operatorjson && matchConfig.dquote == 0) {
                let s_next = "";
                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (str.length > 0) {
                        matchConfig.compare = 1;
                        function_str += "luckysheet_compareWith(" + _this.functionParser(str) + ",'" + s + s_next + "', ";
                        str = "";
                    } 
                    else {
                        function_str += s + s_next;
                    }

                    i++;
                } 
                else {
                    if (str.length > 0) {
                        matchConfig.compare = 1;
                        function_str += "luckysheet_compareWith(" + _this.functionParser(str) + ",'" + s + "', ";
                        str = "";
                    } 
                    else {
                        function_str += s;
                    }
                }
            } 
            else {
                str += s;
            }

            if (i == funcstack.length - 1) {
                if (_this.iscelldata($.trim(str))) {
                    function_str += "luckysheet_getcelldata('" + $.trim(str) + "')";
                } 
                else {
                    function_str += $.trim(str);
                }
            }

            i++;
        }

        return function_str;
    },
    calPostfixExpression: function(cal){
        if(cal.length == 0){
            return "";
        }

        let stack = [];
        for(let i = cal.length - 1; i >= 0; i--){
            let c = cal[i];
            if(c in this.operatorjson){
                let s2 = stack.pop();
                let s1 = stack.pop();

                let str = "luckysheet_compareWith(" + s1 + ",'" + c + "', " + s2 + ")";

                stack.push(str);
            }
            else{
                stack.push(c);
            }
        }

        if(stack.length > 0){
            return stack[0];
        }
        else{
            return "";
        }    
    },
    checkBracketNum: function(fp){
        let bra_l = fp.match(/\(/g),
            bra_r = fp.match(/\)/g),
            bra_tl_txt = fp.match(/(['"])(?:(?!\1).)*?\1/g),
            bra_tr_txt = fp.match(/(['"])(?:(?!\1).)*?\1/g);

        let bra_l_len = 0, bra_r_len = 0;
        if (bra_l != null) {
            bra_l_len += bra_l.length;
        }
        if (bra_r != null) {
            bra_r_len += bra_r.length;
        }

        let bra_tl_len = 0, bra_tr_len = 0;
        if(bra_tl_txt != null){
            for(let i = 0; i < bra_tl_txt.length; i++){
                let bra_tl = bra_tl_txt[i].match(/\(/g);
                if (bra_tl != null) {
                    bra_tl_len += bra_tl.length;
                }
            }
        }

        if(bra_tr_txt != null){
            for(let i = 0; i < bra_tr_txt.length; i++){
                let bra_tr = bra_tr_txt[i].match(/\)/g);
                if (bra_tr != null) {
                    bra_tr_len += bra_tr.length;
                }
            }
        }

        bra_l_len -= bra_tl_len;
        bra_r_len -= bra_tr_len;

        if(bra_l_len != bra_r_len){
            return false;
        }
        else{
            return true;
        }
    },
    operatorPriority: {
        "^": 0,
        "%": 1,
        "*": 1,
        "/": 1,
        "+": 2,
        "-": 2
    },
    functionParser: function(txt, cellRangeFunction) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};
            
            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "";

        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0,
            "compare": 0,
            "braces": 0
        }

        //=(sum(b1:c10)+10)*5-100

        //=MAX(B1:C10,10)*5-100

        // =(sum(max(B1:C10,10)*5-100,((1+1)*2+5)/2,10)+count(B1:C10,10*5-100))*5-100

        //=SUM(MAX(B1:C10,10)*5-100,((1+1)*2+5)/2,10)+COUNT(B1:C10,10*5-100)

        //=SUM(MAX(B1:C10,10)*5-100,((1+1)*2+5)/2,10)

        //=SUM(10,((1+1)*2+5)/2,10)

        //=SUM(MAX(B1:C10,10)*5-100)

        //bracket 0为运算符括号、1为函数括号
        let cal1 = [], cal2 = [], bracket = [];

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                if (str.length > 0 && bracket.length == 0) {
                    function_str += "luckysheet_function." + str.toUpperCase() + ".f(";
                    bracket.push(1);
                    str = "";
                }
                else if(bracket.length == 0) {
                    function_str += "(";
                    bracket.push(0);
                    str = "";
                }
                else{
                    bracket.push(0);
                    str += s;
                }
            } 
            else if (s == ")" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                let bt = bracket.pop();

                if(bracket.length == 0){
                    function_str += _this.functionParser(str,cellRangeFunction) + ")";
                    str = "";
                }
                else{
                    str += s;
                }
            }
            else if(s == "{" && matchConfig.dquote == 0){
                str += '{';
                matchConfig.braces += 1;
            }
            else if(s == "}" && matchConfig.dquote == 0){
                str += '}';
                matchConfig.braces -= 1;
            }
            else if (s == '"') {
                str += '"';
                
                if (matchConfig.dquote > 0) {
                    matchConfig.dquote -= 1;
                } 
                else {
                    matchConfig.dquote += 1;
                }
            } 
            else if (s == ',' && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                if(bracket.length <= 1){
                    function_str += _this.functionParser(str,cellRangeFunction) + ",";
                    str = "";
                }
                else{
                    str += ",";
                }
            }
            else if (s in _this.operatorjson && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                let s_next = "";
                let op = _this.operatorPriority;

                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                if ((s + s_next) in _this.operatorjson) {
                    if(bracket.length == 0){
                        if($.trim(str).length > 0){
                            cal2.unshift(_this.functionParser($.trim(str),cellRangeFunction));
                        }
                        else if($.trim(function_str).length > 0){
                            cal2.unshift($.trim(function_str));
                        }

                        if(cal1[0] in _this.operatorjson){
                            let stackCeilPri = op[cal1[0]];

                            while(cal1.length > 0 && stackCeilPri != null){
                                cal2.unshift(cal1.shift());
                                stackCeilPri = op[cal1[0]];
                            }
                        }

                        cal1.unshift(s+s_next);
                       
                        function_str= "";
                        str = "";
                    } 
                    else {
                        str += s + s_next;
                    }

                    i++;
                } 
                else {
                    if(bracket.length == 0){
                        if($.trim(str).length > 0){
                            cal2.unshift(_this.functionParser($.trim(str),cellRangeFunction));
                        }
                        else if($.trim(function_str).length > 0){
                            cal2.unshift($.trim(function_str));
                        }

                        if(cal1[0] in _this.operatorjson){
                            let stackCeilPri = op[cal1[0]];
                            stackCeilPri = stackCeilPri == null ? 1000 : stackCeilPri;
                            
                            let sPri = op[s];
                            sPri = sPri == null ? 1000 : sPri;

                            while(cal1.length > 0 && sPri >= stackCeilPri){
                                cal2.unshift(cal1.shift());

                                stackCeilPri = op[cal1[0]];
                                stackCeilPri = stackCeilPri == null ? 1000 : stackCeilPri;
                            }
                        }

                        cal1.unshift(s);

                        function_str= "";
                        str = "";
                    }
                    else{
                        str += s;
                    }
                }
            } 
            else {
                if (matchConfig.dquote == 0) {
                    str += $.trim(s);
                } 
                else {
                    str += s;
                }
            }

            if (i == funcstack.length - 1) {
                let endstr = "";

                if (_this.iscelldata($.trim(str))) {
                    let str_nb = $.trim(str);
                    endstr = "luckysheet_getcelldata('" +str_nb + "')";
                    if(typeof(cellRangeFunction)=="function"){
                        cellRangeFunction(str_nb);
                    }
                } 
                else {
                    str = $.trim(str);
                    
                    let regx = /{.*?}/;
                    if(regx.test(str) && str.substr(0, 1) != '"' && str.substr(str.length - 1, 1) != '"'){
                        let arraytxt = regx.exec(str)[0];
                        let arraystart = str.search(regx);
                        let alltxt = "";
                        
                        if(arraystart > 0){
                            endstr += str.substr(0, arraystart);
                        }
                        
                        endstr += "luckysheet_getarraydata('" + arraytxt + "')";

                        if(arraystart + arraytxt.length < str.length){
                            endstr += str.substr(arraystart + arraytxt.length, str.length);
                        }
                    }
                    else{
                        endstr = str;
                    }
                }

                if(endstr.length > 0){
                    cal2.unshift(endstr);
                }

                if(cal1.length > 0){
                    if(function_str.length > 0){
                        cal2.unshift(function_str);
                        function_str = "";
                    }
                   
                    while(cal1.length > 0){
                        cal2.unshift(cal1.shift());
                    }     
                }

                if(cal2.length > 0){
                    function_str = _this.calPostfixExpression(cal2);
                }
                else{
                    function_str += endstr;
                }
            }

            i++;
        }
        console.log(function_str);
        return function_str;
    },
    addFunctionGroup: function(r, c, func, index) {
        if (index == null) {
            index = Store.currentSheetIndex;
        }

        let luckysheetfile = getluckysheetfile();
        let file = luckysheetfile[getSheetIndex(index)];
        if (file.calcChain == null) {
            file.calcChain = [];
        }

        let cc = {
            "r": r,
            "c": c,
            "index": index,
            "func": func
        };
        file.calcChain.push(cc);

        server.saveParam("fc", index, JSON.stringify(cc), {
            "op": "add",
            "pos": file.calcChain.length - 1
        });
        setluckysheetfile(luckysheetfile);
    },
    getFunctionGroup: function(index) {
        if (index == null) {
            index = Store.currentSheetIndex;
        }

        let luckysheetfile = getluckysheetfile();
        let file = luckysheetfile[getSheetIndex(index)];
        
        if (file.calcChain == null) {
            return [];
        }

        return file.calcChain;
    },
    updateFunctionGroup: function(r, c, func, index) {
        if (index == null) {
            index = Store.currentSheetIndex;
        }

        let luckysheetfile = getluckysheetfile();
        let file = luckysheetfile[getSheetIndex(index)];
        
        let calcChain = file.calcChain;
        if (calcChain != null) {
            for (let i = 0; i < calcChain.length; i++) {
                let calc = calcChain[i];
                if (calc.r == r && calc.c == c && calc.index == index) {
                    calcChain[i].func = func;
                    server.saveParam("fc", index, JSON.stringify(calc), {
                        "op": "update",
                        "pos": i
                    });
                    break;
                }
            }
        }

        setluckysheetfile(luckysheetfile);
    },
    insertUpdateFunctionGroup: function(r, c, func, index) {
        if (index == null) {
            index = Store.currentSheetIndex;
        }

        if (func == null) {
            this.delFunctionGroup(r, c, index);
            return;
        }

        let luckysheetfile = getluckysheetfile();
        let file = luckysheetfile[getSheetIndex(index)];

        let calcChain = file.calcChain;
        if (calcChain == null) {
            calcChain = [];
        }

        for (let i = 0; i < calcChain.length; i++) {
            let calc = calcChain[i];
            if (calc.r == r && calc.c == c && calc.index == index) {
                calc.func = func;
                server.saveParam("fc", index, JSON.stringify(calc), {
                    "op": "update",
                    "pos": i
                });
                return;
            }
        }

        let cc = {
            "r": r,
            "c": c,
            "index": index,
            "func": func
        };
        calcChain.push(cc);
        file.calcChain = calcChain;

        server.saveParam("fc", index, JSON.stringify(cc), {
            "op": "add",
            "pos": file.calcChain.length - 1
        });
        setluckysheetfile(luckysheetfile);
    },
    isFunctionRangeSave: false,
    isFunctionRange1: function(txt, r, c) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;

        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0
        }

        let luckysheetfile = getluckysheetfile();
        let dynamicArray_compute = luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray_compute"] == null ? {} : luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray_compute"];

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0) {
                matchConfig.bracket += 1;

                if (str.length > 0) {
                    function_str += "luckysheet_function." + str.toUpperCase() + ".f(";
                } 
                else {
                    function_str += "(";
                }

                str = "";
            } 
            else if (s == ")" && matchConfig.dquote == 0) {
                matchConfig.bracket -= 1;
                function_str += _this.isFunctionRange(str, r, c) + ")";
                str = "";
            } 
            else if (s == ',' && matchConfig.dquote == 0) {
                //matchConfig.comma += 1;
                function_str += _this.isFunctionRange(str, r, c) + ',';
                str = "";
            } 
            else if (s in _this.operatorjson && matchConfig.dquote == 0) {
                let s_next = "";

                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (str.length > 0) {
                        function_str += _this.isFunctionRange(str, r, c) + s + s_next;
                        str = "";
                    } 
                    else {
                        function_str += s + s_next;
                    }

                    i++;
                } 
                else {
                    if (str.length > 0) {
                        function_str += _this.isFunctionRange(str, r, c) + s;
                        str = "";
                    } 
                    else {
                        function_str += s;
                    }
                }
            } 
            else {
                str += s;
            }

            if (i == funcstack.length - 1) {
                if (_this.iscelldata($.trim(str))) {
                    if (r != null && c != null) {
                        let range = _this.getcellrange($.trim(str));
                        let row = range.row,
                            col = range.column;

                        if ((r + "_" + c) in dynamicArray_compute) {
                            let isd_range = false;

                            for (let d_r = row[0]; d_r <= row[1]; d_r++) {
                                for (let d_c = col[0]; d_c <= col[1]; d_c++) {
                                    if ((d_r + "_" + d_c) in dynamicArray_compute && dynamicArray_compute[d_r + "_" + d_c].r == r && dynamicArray_compute[d_r + "_" + d_c].c == c) {
                                        isd_range = true;
                                    }
                                }
                            }

                            if (isd_range) {
                                _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
                            }
                            else {
                                _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
                            }
                        }
                        else {
                            if (r >= row[0] && r <= row[1] && c >= col[0] && c <= col[1]) {
                                _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
                            }
                            else {
                                _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
                            }
                        }
                    }
                    else {
                        let sheetlen = $.trim(str).split("!");

                        if (sheetlen.length > 1) {
                            _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
                        }
                        else {
                            _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
                        }
                    }
                }
                else {
                    //console.log(str);
                }
            }

            i++;
        }
        //console.log(function_str);
        return function_str;
    },
    isFunctionRange: function (txt, r, c) {
        let _this = this;

        if (_this.operatorjson == null) {
            let arr = _this.operator.split("|"),
                op = {};

            for (let i = 0; i < arr.length; i++) {
                op[arr[i].toString()] = 1;
            }

            _this.operatorjson = op;
        }

        if (txt.substr(0, 1) == "=") {
            txt = txt.substr(1);
        }

        let funcstack = txt.split("");
        let i = 0,
            str = "",
            function_str = "",
            ispassby = true;

        let matchConfig = {
            "bracket": 0,
            "comma": 0,
            "squote": 0,
            "dquote": 0,
            "compare": 0,
            "braces": 0
        }

        let luckysheetfile = getluckysheetfile();
        let dynamicArray_compute = luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray_compute"] == null ? {} : luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray_compute"];

        //bracket 0为运算符括号、1为函数括号
        let cal1 = [], cal2 = [], bracket = [];

        while (i < funcstack.length) {
            let s = funcstack[i];

            if (s == "(" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                if (str.length > 0 && bracket.length == 0) {
                    function_str += "luckysheet_function." + str.toUpperCase() + ".f(";
                    bracket.push(1);
                    str = "";
                }
                else if (bracket.length == 0) {
                    function_str += "(";
                    bracket.push(0);
                    str = "";
                }
                else {
                    bracket.push(0);
                    str += s;
                }
            }
            else if (s == ")" && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                let bt = bracket.pop();

                if (bracket.length == 0) {
                    function_str += _this.isFunctionRange(str,r,c) + ")";
                    str = "";
                }
                else {
                    str += s;
                }
            }
            else if (s == "{" && matchConfig.dquote == 0) {
                str += '{';
                matchConfig.braces += 1;
            }
            else if (s == "}" && matchConfig.dquote == 0) {
                str += '}';
                matchConfig.braces -= 1;
            }
            else if (s == '"') {
                str += '"';

                if (matchConfig.dquote > 0) {
                    matchConfig.dquote -= 1;
                }
                else {
                    matchConfig.dquote += 1;
                }
            }
            else if (s == ',' && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                if (bracket.length <= 1) {
                    function_str += _this.isFunctionRange(str, r, c) + ",";
                    str = "";
                }
                else {
                    str += ",";
                }
            }
            else if (s in _this.operatorjson && matchConfig.dquote == 0 && matchConfig.braces == 0) {
                let s_next = "";
                let op = _this.operatorPriority;

                if ((i + 1) < funcstack.length) {
                    s_next = funcstack[i + 1];
                }

                if ((s + s_next) in _this.operatorjson) {
                    if (bracket.length == 0) {
                        if ($.trim(str).length > 0) {
                            cal2.unshift(_this.isFunctionRange($.trim(str), r, c));
                        }
                        else if ($.trim(function_str).length > 0) {
                            cal2.unshift($.trim(function_str));
                        }

                        if (cal1[0] in _this.operatorjson) {
                            let stackCeilPri = op[cal1[0]];

                            while (cal1.length > 0 && stackCeilPri != null) {
                                cal2.unshift(cal1.shift());
                                stackCeilPri = op[cal1[0]];
                            }
                        }

                        cal1.unshift(s + s_next);

                        function_str = "";
                        str = "";
                    }
                    else {
                        str += s + s_next;
                    }

                    i++;
                }
                else {
                    if (bracket.length == 0) {
                        if ($.trim(str).length > 0) {
                            cal2.unshift(_this.isFunctionRange($.trim(str), r, c));
                        }
                        else if ($.trim(function_str).length > 0) {
                            cal2.unshift($.trim(function_str));
                        }

                        if (cal1[0] in _this.operatorjson) {
                            let stackCeilPri = op[cal1[0]];
                            stackCeilPri = stackCeilPri == null ? 1000 : stackCeilPri;

                            let sPri = op[s];
                            sPri = sPri == null ? 1000 : sPri;

                            while (cal1.length > 0 && sPri >= stackCeilPri) {
                                cal2.unshift(cal1.shift());

                                stackCeilPri = op[cal1[0]];
                                stackCeilPri = stackCeilPri == null ? 1000 : stackCeilPri;
                            }
                        }

                        cal1.unshift(s);

                        function_str = "";
                        str = "";
                    }
                    else {
                        str += s;
                    }
                }
            }
            else {
                if (matchConfig.dquote == 0) {
                    str += $.trim(s);
                }
                else {
                    str += s;
                }
            }

            if (i == funcstack.length - 1) {
                let endstr = "";

                if (_this.iscelldata($.trim(str))) {
                    endstr = "luckysheet_getcelldata('" + $.trim(str) + "')";

                    _this.isFunctionRangeSaveChange(str, r, c, dynamicArray_compute);
                }
                else {
                    str = $.trim(str);

                    let regx = /{.*?}/;
                    if (regx.test(str) && str.substr(0, 1) != '"' && str.substr(str.length - 1, 1) != '"') {
                        let arraytxt = regx.exec(str)[0];
                        let arraystart = str.search(regx);
                        let alltxt = "";

                        if (arraystart > 0) {
                            endstr += str.substr(0, arraystart);
                        }

                        endstr += "luckysheet_getarraydata('" + arraytxt + "')";

                        if (arraystart + arraytxt.length < str.length) {
                            endstr += str.substr(arraystart + arraytxt.length, str.length);
                        }
                    }
                    else {
                        endstr = str;
                    }
                }

                if (endstr.length > 0) {
                    cal2.unshift(endstr);
                }

                if (cal1.length > 0) {
                    if (function_str.length > 0) {
                        cal2.unshift(function_str);
                        function_str = "";
                    }

                    while (cal1.length > 0) {
                        cal2.unshift(cal1.shift());
                    }
                }

                if (cal2.length > 0) {
                    function_str = _this.calPostfixExpression(cal2);
                }
                else {
                    function_str += endstr;
                }
            }

            i++;
        }
        //console.log(function_str);
        _this.checkSpecialFunctionRange(function_str, r, c, dynamicArray_compute);
        return function_str;
    },
    isFunctionRangeSaveChange: function (str, r, c, dynamicArray_compute) {
        let _this = this;
        if (r != null && c != null) {
            let range = _this.getcellrange($.trim(str));
            let row = range.row,
                col = range.column;

            if ((r + "_" + c) in dynamicArray_compute) {
                let isd_range = false;

                for (let d_r = row[0]; d_r <= row[1]; d_r++) {
                    for (let d_c = col[0]; d_c <= col[1]; d_c++) {
                        if ((d_r + "_" + d_c) in dynamicArray_compute && dynamicArray_compute[d_r + "_" + d_c].r == r && dynamicArray_compute[d_r + "_" + d_c].c == c) {
                            isd_range = true;
                        }
                    }
                }

                if (isd_range) {
                    _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
                }
                else {
                    _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
                }
            }
            else {
                if (r >= row[0] && r <= row[1] && c >= col[0] && c <= col[1]) {
                    _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
                }
                else {
                    _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
                }
            }
        }
        else {
            let sheetlen = $.trim(str).split("!");

            if (sheetlen.length > 1) {
                _this.isFunctionRangeSave = _this.isFunctionRangeSave || true;
            }
            else {
                _this.isFunctionRangeSave = _this.isFunctionRangeSave || false;
            }
        }
    },
    checkSpecialFunctionRange: function (function_str, r, c, dynamicArray_compute) {
        if (function_str.substr(0, 20) == "luckysheet_function.") {
            let funcName = function_str.split(".")[1];
            if (funcName != null) {
                funcName = funcName.toUpperCase();
                if (funcName == "INDIRECT") {
                    let tempFunc = "luckysheet_indirect_check" + function_str.substr(30, function_str.length);

                    //tempFunc = tempFunc.replace(/luckysheet_getcelldata/g, "luckysheet_indirect_check_return");

                    try {
                        let str = eval(tempFunc);
                        if(str instanceof Object && str.data!=null){
                            str = str.data.v;
                        }
                        if (this.iscelldata($.trim(str))) {
                            this.isFunctionRangeSaveChange(str, r, c, dynamicArray_compute);
                            //console.log(function_str, str, this.isFunctionRangeSave,r,c);
                        }
                    }
                    catch{

                    }
                    
                    
                }
                else if (funcName == "OFFSET") {
                    let tempFunc = "luckysheet_offset_check" + function_str.substr(28, function_str.length);

                    try {
                        let str = eval(tempFunc);
                        if (this.iscelldata($.trim(str))) {
                            this.isFunctionRangeSaveChange(str, r, c, dynamicArray_compute);
                            //console.log(function_str, str, this.isFunctionRangeSave,r,c);
                        }
                    }
                    catch{

                    }
                    //let result = eval(function_str);

                    //console.log(function_str, result);
                }
            }

        }
    },
    execvertex: {},
    execFunctionGroupData: null,
    execFunctionExist: null,
    execFunctionGroupForce:function(isForce){
        if(isForce){
            this.execFunctionGroup(undefined, undefined, undefined, undefined, undefined,true);
        }
        else{
            this.execFunctionGroup();
        }
    },
    execFunctionGroup: function(origin_r, origin_c, value, index, data, isForce=false) {
        let _this = this;
        
        if (data == null) {
            data = Store.flowdata;
        }

        if (!window.luckysheet_compareWith) {
            window.luckysheet_compareWith = luckysheet_compareWith;
            window.luckysheet_getarraydata = luckysheet_getarraydata;
            window.luckysheet_getcelldata = luckysheet_getcelldata;
            window.luckysheet_parseData = luckysheet_parseData;
            window.luckysheet_getValue = luckysheet_getValue;
            window.luckysheet_indirect_check = luckysheet_indirect_check;
            window.luckysheet_indirect_check_return = luckysheet_indirect_check_return;
            window.luckysheet_offset_check = luckysheet_offset_check;
        }
        
        _this.execFunctionGroupData = $.extend(true, [], data);
        
        if (value != null) {
            //此处setcellvalue 中this.execFunctionGroupData会保存想要更新的值，本函数结尾不要设为null,以备后续函数使用
            setcellvalue(origin_r, origin_c, _this.execFunctionGroupData, value);
        }

        if (index == null) {
            index = Store.currentSheetIndex;
        }

        //{ "r": r, "c": c, "index": index, "func": func}
        let group = _this.getFunctionGroup(index),
            vertex1 = {},
            stack = [],
            count = 0;

        _this.execvertex = {};
        if (_this.execFunctionExist == null) {
            let luckysheetfile = getluckysheetfile();

            for (let i = 0; i < group.length; i++) {
                let item = group[i];

                let cell = luckysheetfile[getSheetIndex(item["index"])].data[item.r][item.c];

                if(cell != null && cell.f != null && cell.f == item.func[2]){
                    if(!(item instanceof Object)){
                        item = eval('('+ item +')');
                    }

                    item.color = "w";
                    item.parent = null;
                    item.chidren = {};
                    item.times = 0;

                    vertex1["r" + item.r.toString() + "c" + item.c.toString()] = item;
                    _this.isFunctionRangeSave = false;

                    if(isForce){
                        _this.isFunctionRangeSave = true;
                    }
                    else if (origin_r != null && origin_c != null) {
                        _this.isFunctionRange(item.func[2], origin_r, origin_c);
                    } 
                    else {
                        _this.isFunctionRange(item.func[2]);
                    }

                    if (_this.isFunctionRangeSave) {
                        stack.push(item);
                        _this.execvertex["r" + item.r.toString() + "c" + item.c.toString()] = item;
                        count++;
                    }
                }
            }
        } 
        else {
            for (let x = 0; x < _this.execFunctionExist.length; x++) {
                let cell = _this.execFunctionExist[x];

                if ("r" + cell.r.toString() + "c" + cell.c.toString() in vertex1) {
                    continue;
                }

                for (let i = 0; i < group.length; i++) {
                    let item = group[i];

                    item.color = "w";
                    item.parent = null;
                    item.chidren = {};
                    item.times = 0;

                    vertex1["r" + item.r.toString() + "c" + item.c.toString()] = item;
                    _this.isFunctionRangeSave = false;
                    if(isForce){
                        _this.isFunctionRangeSave = true;
                    }
                    else{
                        _this.isFunctionRange(item.func[2], cell.r, cell.c);
                    }
                    
                    if (_this.isFunctionRangeSave) {
                        stack.push(item);
                        _this.execvertex["r" + item.r.toString() + "c" + item.c.toString()] = item;
                        count++;
                    }
                }
            }
        }
        
        while (stack.length > 0) {
            let u = stack.shift();

            for (let name in vertex1) {
                if (u.r == vertex1[name].r && u.c == vertex1[name].c) {
                    continue;
                }

                _this.isFunctionRangeSave = false;
                _this.isFunctionRange(vertex1[name].func[2], u.r, u.c);

                if (_this.isFunctionRangeSave) {
                    let v = vertex1[name];

                    if (!(name in _this.execvertex)) {
                        stack.push(v);
                        _this.execvertex[name] = v;
                    }

                    count++;
                    _this.execvertex[name].chidren["r" + u.r.toString() + "c" + u.c.toString()] = 1;
                }
            }
        }

        _this.groupValuesRefreshData = [];
        let i = 0;

        while (i < count) {
            for (let name in _this.execvertex) {
                let u = _this.execvertex[name];

                if (u.color == "w") {
                    _this.functionDFS(u);
                } 
                else if (u.color == "b") {
                    i++;
                }
            }
        }
        
        _this.execFunctionExist = null;
    },
    //深度优先算法，处理多级调用函数
    functionDFS: function(u) {
        let _this = this;

        u.color = "g";
        u.times += 1;

        for (let chd in u.chidren) {
            let v = _this.execvertex[chd];
            if (v.color == "w") {
                v.parent = "r" + u.r.toString() + "c" + u.c.toString();
                _this.functionDFS(v);
            }
        }

        u.color = "b";
        window.luckysheet_getcelldata_cache = null;

        let v = _this.execfunction(u.func[2], u.r, u.c);

        let value = _this.execFunctionGroupData[u.r][u.c];
        if(value == null){
            value = {};
        }

        value.v = v[1];
        value.f = v[2];

        if(value.spl != null){
            window.luckysheetCurrentRow = u.r;
            window.luckysheetCurrentColumn = u.c;
            window.luckysheetCurrentFunction = _this.execFunctionGroupData[u.r][u.c].f;

            let fp = $.trim(_this.functionParser(_this.execFunctionGroupData[u.r][u.c].f));
            let sparklines = eval(fp);
            value.spl = sparklines;
        }

        _this.groupValuesRefreshData.push({
            "r": u.r,
            "c": u.c,
            "v": value,
            "i": Store.currentSheetIndex
        });

        _this.execFunctionGroupData[u.r][u.c] = value;
    },
    groupValuesRefreshData: [],
    groupValuesRefresh: function() {
        let _this = this;

        if(_this.groupValuesRefreshData.length > 0){
            for (let i = 0; i < _this.groupValuesRefreshData.length; i++) {
                let item = _this.groupValuesRefreshData[i];

                if(item.i != Store.currentSheetIndex){
                    continue;
                }

                setcellvalue(item.r, item.c, Store.flowdata, item.v);
                server.saveParam("v", Store.currentSheetIndex, item.v, {
                    "r": item.r,
                    "c": item.c
                });
            }

            editor.webWorkerFlowDataCache(Store.flowdata);//worker存数据
        }
    },
    delFunctionGroup: function(r, c, index) {
        if (index == null) {
            index = Store.currentSheetIndex;
        }

        let luckysheetfile = getluckysheetfile();
        let file = luckysheetfile[getSheetIndex(index)];
        
        let calcChain = file.calcChain;
        if (calcChain != null) {
            for (let i = 0; i < calcChain.length; i++) {
                let calc = calcChain[i];
                if (calc.r == r && calc.c == c && calc.index == index) {
                    calcChain.splice(i, 1);
                    server.saveParam("fc", index, null, {
                        "op": "del",
                        "pos": i
                    });
                    break;
                }
            }
        }

        setluckysheetfile(luckysheetfile);
    },
    execfunction1: function(txt, r, c, isrefresh) {
        let _this = this;

        let fp = $.trim(_this.functionParser(txt));
        let funcf = fp.match(/luckysheet_function/g),
            funcg = fp.match(/luckysheet_getcelldata/g),
            funcc = fp.match(/luckysheet_compareWith/g),
            funclen = 0;

        if (isrefresh == null) {
            isrefresh = false;
        }

        if (funcf != null) {
            funclen += funcf.length;
        }

        if (funcg != null) {
            funclen += funcg.length;
        }

        if (funcc != null) {
            funclen += funcc.length;
        }

        let quota1 = fp.match(/\(/g),
            quota2 = fp.match(/\)/g),
            quotalen = 0;

        if (quota1 != null) {
            quotalen += quota1.length;
        }

        if (quota2 != null) {
            quotalen += quota2.length;
        }
        
        if ((fp.substr(0, 20) == "luckysheet_function." || fp.substr(0, 22) == "luckysheet_compareWith") && funclen != quotalen / 2) {
            fp += ")";

            if(fp.substr(0, 20) == "luckysheet_function."){
                txt += ")";
            }

            _this.functionHTMLIndex = 0;
            $("#luckysheet-functionbox-cell").html('<span dir="auto" class="luckysheet-formula-text-color">=</span>' + _this.functionHTML(txt));
        }

        if (!_this.testFunction(txt, fp)) {
            tooltip.info("提示", "公式存在错误");
            return [false, _this.error.n, txt];
        }

        let result = null;
        window.luckysheetCurrentRow = r;
        window.luckysheetCurrentColumn = c;
        window.luckysheetCurrentFunction = txt;

        try {
            result = eval(fp);
        } 
        catch (e) {
            let err = e;
            //err错误提示处理
            console.log(e);
            err = _this.errorInfo(err);
            result = [_this.error.n, err];
        }

        if (result instanceof Array) {
            result = result[0];
            //错误处理
        }
        else if(result instanceof Object){
            result = result.data;
            if (result instanceof Array) {
                result = result[0];
            }
        }

        window.luckysheetCurrentRow = null;
        window.luckysheetCurrentColumn = null;
        window.luckysheetCurrentFunction = null;

        if (fp.substr(0, 19) == "luckysheet_getcelldata(") {
            if (result instanceof Array) {
                result = result.join(",");
            } 
            else if (result instanceof Object) {
                result = result.v;
            }
        }

        if (r != null && c != null) {
            if (isrefresh) {
                _this.execFunctionGroup(r, c, result);
            }
            _this.insertUpdateFunctionGroup(r, c, [true, result, txt]);
        }

        return [true, result, txt];
    },
    execfunction: function(txt, r, c, isrefresh, notInsertFunc) {
        let _this = this;

        let _locale = locale();
        let locale_formulaMore = _locale.formulaMore;
        
        if(txt.indexOf(_this.error.r) > -1){
            return [false, _this.error.r, txt];
        }

        if (!_this.checkBracketNum(txt)) {
            txt += ")";
        }

        let fp = $.trim(_this.functionParser(txt));
        
        if ((fp.substr(0, 20) == "luckysheet_function." || fp.substr(0, 22) == "luckysheet_compareWith") ) {
            _this.functionHTMLIndex = 0;
        }

        if (!_this.testFunction(txt, fp) || fp == "") {
            tooltip.info("",locale_formulaMore.execfunctionError);
            return [false, _this.error.n, txt];
        }

        let result = null;
        window.luckysheetCurrentRow = r;
        window.luckysheetCurrentColumn = c;
        window.luckysheetCurrentFunction = txt;

        let sparklines = null;

        try {
            if(fp.indexOf("luckysheet_getcelldata") > -1){
                let funcg = fp.split("luckysheet_getcelldata('");

                for(let i = 1; i < funcg.length; i++){
                    let funcgStr = funcg[i].split("')")[0];
                    let funcgRange = _this.getcellrange(funcgStr);

                    if(funcgRange.row[0] < 0 || funcgRange.column[0] < 0){
                        return [true, _this.error.r, txt];
                    }

                    if(funcgRange.sheetIndex == Store.currentSheetIndex && r >= funcgRange.row[0] && r <= funcgRange.row[1] && c >= funcgRange.column[0] && c <= funcgRange.column[1]){
                        if(isEditMode()){
                            alert(locale_formulaMore.execfunctionSelfError);
                        }
                        else{
                            tooltip.info("", locale_formulaMore.execfunctionSelfErrorResult);
                            
                        }

                        return [false, 0, txt];
                    }
                }
            }

            result = eval(fp);

            //加入sparklines的参数项目
            if(fp.indexOf("SPLINES") > -1){
                sparklines = result;
                result = "";
            }
        } 
        catch (e) {
            let err = e;
            //err错误提示处理
            console.log(e);
            err = _this.errorInfo(err);
            result = [_this.error.n, err];
        }

        //公式结果是对象，则表示只是选区。如果是单个单元格，则返回其值；如果是多个单元格，则返回 #VALUE!。
        if(getObjType(result) == "object" && result.startCell != null){
            if(getObjType(result.data) == "array"){
                result = _this.error.v;
            }
            else{
                if(result.data == null || isRealNull(result.data.v)){
                    result = 0;
                }
                else{
                    result = result.data.v;
                }
            }
        }

        //公式结果是数组，分错误值 和 动态数组 两种情况
        if(getObjType(result) == "array"){
            let isErr = false; 

            if(getObjType(result[0]) != "array" && result.length == 2){
                isErr = valueIsError(result[0]);
            }

            if(!isErr){
                if(getObjType(result[0]) == "array" && result.length == 1 && result[0].length == 1){
                    result = result[0][0];
                }
                else{
                    let luckysheetfile = getluckysheetfile();
                    let file = luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
                    let dynamicArray = file["dynamicArray"] == null ? [] : file["dynamicArray"];
                    dynamicArray.push({"r": r, "c": c, "f": txt, "data": result});
                        
                    file["dynamicArray"] = dynamicArray;
                    setluckysheetfile(luckysheetfile);

                    result = "";
                }
            }
            else{
                result = result[0];
            }
        }

        window.luckysheetCurrentRow = null;
        window.luckysheetCurrentColumn = null;
        window.luckysheetCurrentFunction = null;

        if (r != null && c != null) {
            if (isrefresh) {
                _this.execFunctionGroup(r, c, result);
            }

            if(!notInsertFunc){
                _this.insertUpdateFunctionGroup(r, c, [true, result, txt]);
            }
        }

        if(!!sparklines){
            return [true, result, txt, {type: "sparklines", data: sparklines}];
        }

        return [true, result, txt];
    },
    testFunction: function(txt, fp) {
        if (txt.substr(0, 1) == "=") {
            return true;
        } 
        else {
            return false;
        }
    },
    functionResizeData: {},
    functionResizeStatus: false,
    functionResizeTimeout: null,
    data_parm_index: 0  //选择公式后参数索引标记
}

export default luckysheetformula;