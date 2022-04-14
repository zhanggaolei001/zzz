/*
*京喜工厂开团
*一个账号能参团一次，一个账号一天能开三次团，请根据自己的情况设置需要开团的CK，一般至少5个CK能成团
*脚本每执行一次，会领取上一次成团的奖励和新开一次团，每天执行4次能开完3次团和领取3次团的奖励
*环境变量：
*   OPEN_DREAMFACTORY_TUAN 脚本默认第一个CK开团，例：若OPEN_DREAMFACTORY_TUAN="2,3"  则第2，第3个CK开团，其他账号参加第2，第3个CK开的团
*助力规则：
*   开团账号开团，其他账号自动参团。 例：有A,B,C账号，A，B账号开团，则B，C会参加A的团，A会参加B的团
*   账号内互助之后，开团账号若有剩下参团次数，会尝试加入作者团
*成团条件：
*   成团所需人数根据活动所需人数变化，一般为5-7人，
*   若5人成团，则5个CK能成团一次，9个CK能成团两次，13个CK能成团三次
* */
const $ = new Env('京喜工厂开团');
const JD_API_HOST = 'https://m.jingxi.com';
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let openTuanCK = '1';
const args = process.argv.slice(2)
if (args[0]) {
    openTuanCK = args[0]
}
let tuanActiveId = ``;
let cookiesArr = [], cookie = '', message = ' ';
$.tuanIds = [];
$.appId = 10001;
if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [
        $.getdata("CookieJD"),
        $.getdata("CookieJD2"),
        ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie)].filter((item) => !!item);
}
!(async () => {
    let openTuanCKList = openTuanCK.split(',');
    $.CryptoJS = $.isNode() ? require('crypto-js') : CryptoJS;
    await requestAlgo();
    await getTuanActiveId();
    if (!tuanActiveId) { console.log(`未能获取到有效的团活动ID`); return; }

    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    let runFlag = true;
    for (let i = 0; i < cookiesArr.length; i++) {

        if (!openTuanCKList.includes((i + 1).toString())) {
            continue;
        }
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.tuanNum = 0;//成团人数
            await TotalBean();
            console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
                if ($.isNode()) {
                    //await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                runFlag = false;
                continue;
            }
            await jdDreamFactoryTuan();
        }
    }
    if (!runFlag) {
        console.log(`需要开团的CK已过期，请更新CK后重新执行脚本`);
        return;
    }
    console.log(`\n===============开始账号内参团===================`);
    console.log('获取到的内部团ID' + `${$.tuanIds}\n`);
    //打乱CK,再进行参团
    if (!Array.prototype.derangedArray) { Array.prototype.derangedArray = function () { for (var j, x, i = this.length; i; j = parseInt(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x); return this; }; }
    cookiesArr.derangedArray();
    for (let i = 0; i < cookiesArr.length && $.tuanIds.length > 0; i++) {
        if (cookiesArr[i]) {
            $.index = i + 1;
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
            $.isLogin = true;
            $.canHelp = true;//能否参团
            await TotalBean();
            if (!$.isLogin) { continue; }
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
            if ((cookiesArr && cookiesArr.length >= ($.tuanNum || 5)) && $.canHelp) {
                for (let j = 0; j < $.tuanIds.length; j++) {
                    let item = $.tuanIds[j];
                    $.tuanMax = false;
                    if (!$.canHelp) break;
                    console.log(`账号${$.UserName} 去参加团 ${item}`);
                    await JoinTuan(item);
                    await $.wait(2000);
                    if ($.tuanMax) { $.tuanIds.shift(); j--; }
                }
            }
        }
    }
})().catch((e) => { $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '') }).finally(() => { $.done(); });
async function jdDreamFactoryTuan() {
    try {
        await userInfo();
        await tuanActivity();
    }
    catch (e) {
        $.logErr(e);
    }
}
async function getTuanActiveId() {
    const method = `GET`;
    let headers = {};
    let myRequest = { url: 'https://st.jingxi.com/pingou/dream_factory/index.html', method: method, headers: headers };
    return new Promise(async resolve => {
        $.get(myRequest, (err, resp, data) => {
            try {
                data = data && data.match(/window\._CONFIG = (.*) ;var __getImgUrl/);
                if (data) {
                    data = JSON.parse(data[1]);
                    const tuanConfigs = (data[0].skinConfig[0].adConfig || []).filter(vo => !!vo && vo['channel'] === 'h5');
                    if (tuanConfigs && tuanConfigs.length) {
                        for (let item of tuanConfigs) {
                            const start = item.start;
                            const end = item.end;
                            const link = item.link;
                            if (new Date(item.end).getTime() > Date.now()) {
                                if (link && link.match(/activeId=(.*),/) && link.match(/activeId=(.*),/)[1]) {
                                    console.log(`\n获取团活动ID成功: ${link.match(/activeId=(.*),/)[1]}\n有效时段：${start} - ${end}`);
                                    tuanActiveId = link.match(/activeId=(.*),/)[1];
                                    break
                                }
                            } else {
                                tuanActiveId = '';
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(data); $.logErr(e, resp);
            } finally { resolve(); }
        })
    })
}


function userInfo() {
    return new Promise(async resolve => {
        $.get(taskurl('userinfo/GetUserInfo', `pin=&sharePin=&shareType=&materialTuanPin=&materialTuanId=&source=`, '_time,materialTuanId,materialTuanPin,pin,sharePin,shareType,source,zone'), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            data = data['data'];
                            $.unActive = true;//标记是否开启了京喜活动或者选购了商品进行生产
                            $.encryptPin = '';
                            $.shelvesList = [];
                            if (data.factoryList && data.productionList) {
                                const factory = data.factoryList[0];
                                $.factoryId = factory.factoryId;//工厂ID
                                $.encryptPin = data.user.encryptPin;
                            } else {
                                $.unActive = false;//标记是否开启了京喜活动或者选购了商品进行生产
                                if (!data.factoryList) {
                                    console.log(`【提示】京东账号${$.index}[${$.nickName}]京喜工厂活动未开始\n请手动去京东APP->游戏与互动->查看更多->京喜工厂 开启活动\n`);
                                } else if (data.factoryList && !data.productionList) {
                                    console.log(`【提示】京东账号${$.index}[${$.nickName}]京喜工厂未选购商品\n请手动去京东APP->游戏与互动->查看更多->京喜工厂 选购\n`)
                                }
                            }
                        } else {
                            console.log(`GetUserInfo异常：${JSON.stringify(data)}`)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
async function tuanActivity() {
    const tuanConfig = await QueryActiveConfig();
    if (tuanConfig && tuanConfig.ret === 0) {
        const { activeId, surplusOpenTuanNum, tuanId } = tuanConfig['data']['userTuanInfo'];
        console.log(`今日剩余开团次数：${surplusOpenTuanNum}次`);
        $.surplusOpenTuanNum = surplusOpenTuanNum;
        if (!tuanId && surplusOpenTuanNum > 0) {
            //开团
            $.log(`准备开团`)
            await CreateTuan();
        } else if (tuanId) {
            //查询词团信息
            const QueryTuanRes = await QueryTuan(activeId, tuanId);
            if (QueryTuanRes && QueryTuanRes.ret === 0) {
                const { tuanInfo } = QueryTuanRes.data;
                if ((tuanInfo && tuanInfo[0]['endTime']) <= QueryTuanRes['nowTime'] && surplusOpenTuanNum > 0) {
                    $.log(`之前的团已过期，准备重新开团\n`)
                    await CreateTuan();
                } else {
                    for (let item of tuanInfo) {
                        const { realTuanNum, tuanNum, userInfo } = item;
                        $.tuanNum = tuanNum || 0;
                        $.log(`\n开团情况:${realTuanNum}/${tuanNum}\n`);
                        if (realTuanNum === tuanNum) {
                            for (let user of userInfo) {
                                if (user.encryptPin === $.encryptPin) {
                                    if (user.receiveElectric && user.receiveElectric > 0) {
                                        console.log(`您在${new Date(user.joinTime * 1000).toLocaleString()}开团奖励已经领取成功\n`)
                                        if ($.surplusOpenTuanNum > 0) await CreateTuan();
                                    } else {
                                        $.log(`开始领取开团奖励`);
                                        await tuanAward(item.tuanActiveId, item.tuanId);//isTuanLeader
                                    }
                                }
                            }
                        } else {
                            $.tuanIds.push(tuanId);
                            $.log(`\n此团未达领取团奖励人数：${tuanNum}人\n`)
                        }
                    }
                }
            }
        }
    }
}
function QueryActiveConfig() {
    return new Promise((resolve) => {
        const body = `activeId=${escape(tuanActiveId)}&tuanId=`;
        const options = taskTuanUrl(`QueryActiveConfig`, body, `_time,activeId,tuanId`)
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            const { userTuanInfo } = data['data'];
                            console.log(`\n团活动ID  ${userTuanInfo.activeId}`);
                            console.log(`团ID  ${userTuanInfo.tuanId}\n`);
                        } else {
                            console.log(`QueryActiveConfig异常：${JSON.stringify(data)}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}
function QueryTuan(activeId, tuanId) {
    return new Promise((resolve) => {
        const body = `activeId=${escape(activeId)}&tuanId=${escape(tuanId)}`;
        const options = taskTuanUrl(`QueryTuan`, body, `_time,activeId,tuanId`)
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            // $.log(`\n开团情况:${data.data.tuanInfo.realTuanNum}/${data.data.tuanInfo.tuanNum}\n`)
                        } else {
                            console.log(`异常：${JSON.stringify(data)}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}
//开团API
function CreateTuan() {
    return new Promise((resolve) => {
        const body = `activeId=${escape(tuanActiveId)}&isOpenApp=1`
        const options = taskTuanUrl(`CreateTuan`, body, '_time,activeId,isOpenApp')
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            console.log(`开团成功tuanId为：${data.data['tuanId']}`);
                            $.tuanIds.push(data.data['tuanId']);
                        } else {
                            console.log(`开团异常：${JSON.stringify(data)}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function JoinTuan(tuanId, stk = '_time,activeId,tuanId') {
    return new Promise((resolve) => {
        const body = `activeId=${escape(tuanActiveId)}&tuanId=${escape(tuanId)}`;
        const options = taskTuanUrl(`JoinTuan`, body, '_time,activeId,tuanId')
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            console.log(`参团成功：${JSON.stringify(data)}\n`);
                            //$.jdFactoryHelpList[$.UserName] = $.UserName;
                            //$.setdata($.jdFactoryHelpList, 'jdFactoryHelpList');
                            $.canHelp = false;
                        } else if (data['ret'] === 10005 || data['ret'] === 10206) {
                            //火爆，或者今日参团机会已耗尽
                            console.log(`参团失败：${JSON.stringify(data)}\n`);
                            //$.jdFactoryHelpList[$.UserName] = $.UserName;
                            //$.setdata($.jdFactoryHelpList, 'jdFactoryHelpList');
                            $.canHelp = false;
                        } else if (data['ret'] === 10209) {
                            $.tuanMax = true;
                            console.log(`参团失败：${JSON.stringify(data)}\n`);
                        } else {
                            console.log(`参团失败：${JSON.stringify(data)}\n`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function tuanAward(activeId, tuanId, isTuanLeader = true) {
    return new Promise((resolve) => {
        const body = `activeId=${escape(activeId)}&tuanId=${escape(tuanId)}`;
        const options = taskTuanUrl(`Award`, body, '_time,activeId,tuanId')
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data['ret'] === 0) {
                            if (isTuanLeader) {
                                console.log(`开团奖励(团长)${data.data['electric']}领取成功`);
                                message += `【开团(团长)奖励】${data.data['electric']}领取成功\n`;
                                if ($.surplusOpenTuanNum > 0) {
                                    $.log(`开团奖励(团长)已领取，准备开团`);
                                    await CreateTuan();
                                }
                            } else {
                                console.log(`参团奖励${data.data['electric']}领取成功`);
                                message += `【参团奖励】${data.data['electric']}领取成功\n`;
                            }
                        } else if (data['ret'] === 10212) {
                            console.log(`${JSON.stringify(data)}`);

                            if (isTuanLeader && $.surplusOpenTuanNum > 0) {
                                $.log(`团奖励已领取，准备开团`);
                                await CreateTuan();
                            }
                        } else {
                            console.log(`异常：${JSON.stringify(data)}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function TotalBean() {
    return new Promise(async resolve => {
        const options = { "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`, "headers": { "Accept": "application/json,text/plain, */*", "Content-Type": "application/x-www-form-urlencoded", "Accept-Encoding": "gzip, deflate, br", "Accept-Language": "zh-cn", "Connection": "keep-alive", "Cookie": cookie, "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" } };
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (data) { data = JSON.parse(data); if (data['retcode'] === 13) { $.isLogin = false; } if (data['retcode'] === 0) { $.nickName = (data['base'] && data['base'].nickname) || $.UserName; } else { $.nickName = $.UserName; } } else { console.log(`京东服务器返回空数据`) }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") { return true; }
    } catch (e) { console.log(e); console.log(`京东服务器访问数据为空，请检查自身设备网络情况`); return false; }
}
function taskTuanUrl(functionId, body = '', stk) {
    let url = `https://m.jingxi.com/dreamfactory/tuan/${functionId}?${body}&_time=${Date.now()}&_=${Date.now() + 2}&sceneval=2&g_login_type=1&_ste=1`; url += `&h5st=${decrypt(Date.now(), stk || '', '', url)}`; if (stk) { url += `&_stk=${encodeURIComponent(stk)}`; } return { url, headers: { "Accept": "*/*", "Accept-Encoding": "gzip, deflate, br", "Accept-Language": "zh-cn", "Connection": "keep-alive", "Cookie": cookie, "Host": "m.jingxi.com", "Referer": "https://st.jingxi.com/pingou/dream_factory/divide.html", "User-Agent": "jdpingou" } }
}
function taskurl(functionId, body = '', stk) {
    let url = `${JD_API_HOST}/dreamfactory/${functionId}?zone=dream_factory&${body}&sceneval=2&g_login_type=1&_time=${Date.now()}&_=${Date.now() + 2}&_ste=1`; url += `&h5st=${decrypt(Date.now(), stk, '', url)}`; if (stk) { url += `&_stk=${encodeURIComponent(stk)}`; } return { url, headers: { 'Cookie': cookie, 'Host': 'm.jingxi.com', 'Accept': '*/*', 'Connection': 'keep-alive', 'User-Agent': functionId === 'AssistFriend' ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36" : 'jdpingou', 'Accept-Language': 'zh-cn', 'Referer': 'https://wqsd.jd.com/pingou/dream_factory/index.html', 'Accept-Encoding': 'gzip, deflate, br', } }
}
Date.prototype.Format = function (fmt) {
    var e, n = this, d = fmt, l = { "M+": n.getMonth() + 1, "d+": n.getDate(), "D+": n.getDate(), "h+": n.getHours(), "H+": n.getHours(), "m+": n.getMinutes(), "s+": n.getSeconds(), "w+": n.getDay(), "q+": Math.floor((n.getMonth() + 3) / 3), "S+": n.getMilliseconds() }; /(y+)/i.test(d) && (d = d.replace(RegExp.$1, "".concat(n.getFullYear()).substr(4 - RegExp.$1.length))); for (var k in l) { if (new RegExp("(".concat(k, ")")).test(d)) { var t, a = "S+" === k ? "000" : "00"; d = d.replace(RegExp.$1, 1 == RegExp.$1.length ? l[k] : ("".concat(a) + l[k]).substr("".concat(l[k]).length)); } } return d;
};
async function requestAlgo() {
    $.fingerprint = await generateFp(); const options = { "url": `https://cactus.jd.com/request_algo?g_ty=ajax`, "headers": { 'Authority': 'cactus.jd.com', 'Pragma': 'no-cache', 'Cache-Control': 'no-cache', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1', 'Content-Type': 'application/json', 'Origin': 'https://st.jingxi.com', 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty', 'Referer': 'https://st.jingxi.com/', 'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7' }, 'body': JSON.stringify({ "version": "1.0", "fp": $.fingerprint, "appId": $.appId.toString(), "timestamp": Date.now(), "platform": "web", "expandParams": "" }) }; new Promise(async resolve => { $.post(options, (err, resp, data) => { try { if (err) { console.log(`${JSON.stringify(err)}`); console.log(`request_algo 签名参数API请求失败，请检查网路重试`) } else { if (data) { data = JSON.parse(data); if (data['status'] === 200) { $.token = data.data.result.tk; let enCryptMethodJDString = data.data.result.algo; if (enCryptMethodJDString) $.enCryptMethodJD = new Function(`return ${enCryptMethodJDString}`)(); } else { console.log('request_algo 签名参数API请求失败:'); } } else { console.log(`京东服务器返回空数据`); } } } catch (e) { $.logErr(e, resp); } finally { resolve(); } }) });
}
function decrypt(time, stk, type, url) {
    stk = stk || (url ? getUrlData(url, '_stk') : ''); if (stk) { const timestamp = new Date(time).Format("yyyyMMddhhmmssSSS"); let hash1 = ''; if ($.fingerprint && $.token && $.enCryptMethodJD) { hash1 = $.enCryptMethodJD($.token, $.fingerprint.toString(), timestamp.toString(), $.appId.toString(), $.CryptoJS).toString($.CryptoJS.enc.Hex); } else { const random = '5gkjB6SpmC9s'; $.token = `tk01wcdf61cb3a8nYUtHcmhSUFFCfddDPRvKvYaMjHkxo6Aj7dhzO+GXGFa9nPXfcgT+mULoF1b1YIS1ghvSlbwhE0Xc`; $.fingerprint = 5287160221454703; const str = `${$.token}${$.fingerprint}${timestamp}${$.appId}${random}`; hash1 = $.CryptoJS.SHA512(str, $.token).toString($.CryptoJS.enc.Hex); } let st = ''; stk.split(',').map((item, index) => { st += `${item}:${getUrlData(url, item)}${index === stk.split(',').length - 1 ? '' : '&'}`; }); const hash2 = $.CryptoJS.HmacSHA256(st, hash1.toString()).toString($.CryptoJS.enc.Hex); return encodeURIComponent(["".concat(timestamp.toString()), "".concat($.fingerprint.toString()), "".concat($.appId.toString()), "".concat($.token), "".concat(hash2)].join(";")); } else { return '20210318144213808;8277529360925161;10001;tk01w952a1b73a8nU0luMGtBanZTHCgj0KFVwDa4n5pJ95T/5bxO/m54p4MtgVEwKNev1u/BUjrpWAUMZPW0Kz2RWP8v;86054c036fe3bf0991bd9a9da1a8d44dd130c6508602215e50bb1e385326779d'; }
}
function getUrlData(url, name) {
    if (typeof URL !== "undefined") { let urls = new URL(url); let data = urls.searchParams.get(name); return data ? data : ''; } else { const query = url.match(/\?.*/)[0].substring(1); const vars = query.split('&'); for (let i = 0; i < vars.length; i++) { const pair = vars[i].split('='); if (pair[0] === name) { return vars[i].substr(vars[i].indexOf('=') + 1); } } return ''; }
}
function generateFp() {
    let e = "0123456789"; let a = 13; let i = ''; for (; a--;) i += e[Math.random() * e.length | 0]; return (i + Date.now()).slice(0, 16)
}
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
