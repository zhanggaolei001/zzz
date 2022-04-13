
/*
京东入会
脚本兼容: QuantumultX, Node.js 
 非常耗时的脚本最多可能执行半小时 
请配合取关脚本试用使用 jd_unsubscribe.js 提前取关至少250个商店确保京东试用脚本正常运行
==========================Quantumultx=========================
[task_local]
# 取关京东店铺商品请在 boxjs 修改取消关注店铺数量
5 0,8,10,12,16,18,20,22 * * * https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jd_unsubscribe.js, tag=京东入会, enabled=true
# 京东入会
5 0,8,10,12,16,18,20,22 * * * https://raw.githubusercontent.com/ZCY01/daily_scripts/main/jd/jd_try.js, tag=京东试用, img-url=https://raw.githubusercontent.com/ZCY01/img/master/jdtryv1.png, enabled=true
 */

const $ = new Env('京东入会')
const args = process.argv.slice(2)

$.toObj = (t, e = null) => {
	try {
		return JSON.parse(t)
	} catch {
		return e
	}
}
$.toStr = (t, e = null) => {
	try {
		return JSON.stringify(t)
	} catch {
		return e
	}
}
function randomNum(minNum, maxNum) {
	switch (arguments.length) {
		case 1:
			return parseInt(Math.random() * minNum + 1, 10);
			break;
		case 2:
			return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
			break;
		default:
			return 0;
			break;
	}
}

const notify = $.isNode() ? require("./sendNotify") : "";
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
const sck = $.isNode() ? "set-cookie" : "Set-Cookie";
let cookiesArr = [],
	cookie = "",
	message = '',
	messages = '';
let minPrize = 10;//设置最小奖励入会京豆值，入会奖励小于这个值的时候，不自动入会

if ($.isNode()) {
	Object.keys(jdCookieNode).forEach((item) => {
		cookiesArr.push(jdCookieNode[item]);
	});
	if (process.env.JD_DEBUG && process.env.JD_DEBUG === "false") $.log = () => { };
} else {
	cookiesArr = [
		$.getdata("CookieJD"),
		$.getdata("CookieJD2"),
		...jsonParse($.getdata("CookiesJD") || "[]").map((item) => item.cookie),
	].filter((item) => !!item);
}
const JD_API_HOST = "https://api.m.jd.com/client.action";
$.rundisCount = 0;
!(async () => {
	if (!cookiesArr[0]) {
		$.msg(
			$.name,
			"【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取",
			"https://bean.m.jd.com/", {
			"open-url": "https://bean.m.jd.com/"
		}
		);
		return;
	}
	await readShopId();
	await readShopId2();
	//await readShopId3()
	//cookiesArr = cookiesArr.reverse()
	if (cookiesArr[0]) {
		cookie = cookiesArr[randomNum(0,cookiesArr.length - 1)];
		console.log(cookie);
		$.UserName = decodeURIComponent(
			cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]
		);
		message = "";
		await main()
	}
})()
	.catch((e) => {
		$.log("", `❌ ${$.name}, 失败! 原因: ${e}!`, "");
	})
	.finally(() => {
		$.log("本次运行获得:" + $.rundisCount + "京豆");
		$.done();
	});



async function main() {

	let passed = 0;
	let total = $.shopIds.length
	for (var shopId of $.shopIds) {
		passed++;
		console.log($.UserName + ":" + (100 * passed / total).toFixed(4) + "%");
		await getVenderId(shopId);
		if ($.venderId) {
			await getShopOpenCardInfo(shopId, $.venderId);
			if ($.getShopOpenCardInfo) {
				if ($.getShopOpenCardInfo.result) {
					if ($.getShopOpenCardInfo.result.interestsRuleList) {
						let openCardStatus = $.getShopOpenCardInfo.result.userInfo.openCardStatus;
						let venderCardName = $.getShopOpenCardInfo.result.shopMemberCardInfo.venderCardName;
						let interestsRuleList = $.getShopOpenCardInfo.result.interestsRuleList;
						let disCount = 0;
						let objData = {};
						interestsRuleList.forEach(item => {
							if (item.prizeName === '京豆') {
								disCount = disCount + parseInt(item.discountString);
								objData = item.interestsInfo;
							}
						});
						if (disCount > 0) {
							$.log(venderCardName + "店铺入会有" + disCount + "京豆");
							if (disCount >= minPrize) {
								//todo:循环每个cookie，每个都去重新获取下是否已经开卡，如果没有，就开卡：
								for (let i = 1; i < cookiesArr.length; i++) {
									try {
										if (cookiesArr[i]) {
											cookie = cookiesArr[i];
											$.UserName = decodeURIComponent(
												cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]
											);
											await getShopOpenCardInfo(shopId, $.venderId);
											openCardStatus = $.getShopOpenCardInfo.result.userInfo.openCardStatus;
											if (openCardStatus == 0) {
												await bindWithVender(shopId, $.venderId, objData);
											} else {
												console.log($.UserName + ":已经是会员,跳过");
											}
										}
									} catch (error) {
										console.log(error);
										continue;
									}
								}
								cookie = cookiesArr[randomNum(0,cookiesArr.length - 1)];
								$.UserName = decodeURIComponent(
									cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]
								);
							} else {
								//$.log(venderCardName + "只有" + disCount + "个京豆，入会血亏，小于设置的最小领取京豆数，不入会");
							}
						}

					} else {
						//$.log(shopId + "死抠鼻，没奖励");
					}
				} else {
					//$.log(shopId + "好像没有入会奖励");
				}
			} else {
				//$.log(shopId + "没有获取到开卡信息");
			}
		} else {
			//$.log(shopId + "没有获取到店铺信息");
		}
	}
}

function bindWithVender(shopId, venderId, objData = {}) {
	return new Promise((resolve) => {
		let body = JSON.stringify(Object.assign({
			"venderId": venderId,
			"shopId": shopId,
			"bindByVerifyCodeFlag": 1,
			"writeChildFlag": 0,
			"channel": 999,
		}, objData));
		let options = {
			url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=bindWithVender&body=${body}&client=H5&clientVersion=9.2.0&uuid=88888&jsonp=jsonp_1619773276633_84888`,
			headers: {
				Cookie: cookie,
				Host: "api.m.jd.com",
				"Referer": `http://shopmember.m.jd.com/shopcard/?venderId=${venderId}&shopId=${shopId}&venderType=0&channel=999&returnUrl=`,
				"Content-Type": "application/x-www-form-urlencoded",
			}
		};
		$.get(options, (err, resp, res) => {
			try {
				$.result = '';
				let datas = res.match(/({[^()]+})/);
				if (datas) {
					let data = datas[0];
					if (data) {
						data = $.toObj(data);
						if (data) {
							$.result = data.message
							$.log($.UserName + ":店铺Id:" + shopId + ",入会结果：" + $.result);
							let giftList = data.result.giftInfo.giftList;
							if (giftList) {
								let disCount = 0;
								giftList.forEach(item => {
									if (item.prizeName === '京豆') {
										disCount = disCount + parseInt(item
											.discountString);
									} else if (item.prizeType == 4) {
										disCount = disCount + parseInt(item
											.discountString);
									}
								});
								$.rundisCount = $.rundisCount + disCount;
							}
						}
					}
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}


function getVenderId(shopId) {
	return new Promise((resolve) => {
		let options = {
			url: `https://chat1.jd.com/api/checkChat?callback=jQuery83802712&shopId=${shopId}&_=${+new Date()}`,
			headers: {
				'Cookie': cookie,
				"host": "chat1.jd.com",
				"content-type": "application/x-www-form-urlencoded",
				"Referer": `https://mall.jd.com/shopBrandMember-${shopId}.html`,
				"User-Agent": 'jdapp;iPhone;9.5.0;'
			}
		};
		$.get(options, (err, resp, res) => {
			$.venderId = '';
			try {
				let datas = res.match(/({[^()]+})/);
				if (datas) {
					let data = datas[0];
					if (data) {
						data = $.toObj(data);
						if (data) {
							$.venderId = data.venderId;
						}
					}
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve($.venderId);
			}
		})
	});
}

function getShopOpenCardInfo(shopId, venderId) {
	return new Promise((resolve) => {
		let options = {
			url: "http://api.m.jd.com/client.action?appid=jd_shop_member&functionId=getShopOpenCardInfo&body=%7B%22venderId%22%3A%22" +
				venderId +
				"%22%2C%22channel%22%3A999%7D&client=&clientVersion=9.2.0&uuid=88888&jsonp=jsonp_59378",
			headers: {
				Cookie: cookie,
				Host: "api.m.jd.com",
				"Referer": `http://shopmember.m.jd.com/shopcard/?venderId=${venderId}&shopId=${shopId}&venderType=0&channel=999&returnUrl=`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
		};
		$.get(options, (err, resp, res) => {
			$.getShopOpenCardInfo = '';
			try {
				let datas = res.match(/({[^()]+})/);
				if (datas) {
					let data = datas[0];
					if (data) {
						data = $.toObj(data);
						if (data) {
							$.getShopOpenCardInfo = data;
						}
					}
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve($.getShopOpenCardInfo);
			}
		})
	});
}


function safeGet(data) {
	try {
		if (typeof JSON.parse(data) == "object") {
			return true;
		}
	} catch (e) {
		$.log(e);
		$.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
		return false;
	}
}

function jsonParse(str) {
	if (typeof str == "string") {
		try {
			return JSON.parse(str);
		} catch (e) {
			$.log(e);
			$.msg($.name, "", "不要在BoxJS手动复制粘贴修改cookie");
			return [];
		}
	}
}

function readShopId() {
	return new Promise((resolve) => {
		$.get({
			url: 'https://ghproxy.com/https://raw.githubusercontent.com/small-redguy/helper/main/static/ydShopId.txt'
		}, (err, resp, data) => {
			//https://ghproxy.com/https://raw.githubusercontent.com/AntonVanke/JDBrandMember/main/shopid.txt
			//https://ghproxy.com/https://raw.githubusercontent.com/small-redguy/helper/main/static/ydShopId.txt
			try {
				console.log("AAAAAAA");
				$.shopIds = [];
				if (data) {
					data = data + '';
					let shopIdstr = data.split('\n');
					console.log(shopIdstr.length);
					for (let shopId of shopIdstr) {
						$.shopIds.push(shopId.trim());
					}
					$.log('获取店铺数据成功，一共获取到' + $.shopIds.length + '条数据');

				} else {
					$.log(`获取店铺数据失败`)
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve(data);
			}
		})
	});
}

function readShopId2() {
	return new Promise((resolve) => {
		$.get({
			url: 'https://ghproxy.com/https://raw.githubusercontent.com/AntonVanke/JDBrandMember/main/tools/shopid.txt'
		}, (err, resp, data) => {
			//https://ghproxy.com/https://raw.githubusercontent.com/AntonVanke/JDBrandMember/main/shopid.txt
			//https://ghproxy.com/https://raw.githubusercontent.com/small-redguy/helper/main/static/ydShopId.txt
			try {
				console.log("AAAAAAA");
				//	$.shopIds = [];
				if (data) {
					data = data + '';
					let shopIdstr = data.replace('- ','').replace('shop_id:','').split('\n');
					console.log(shopIdstr.length);
					for (let shopId of shopIdstr) {

						$.shopIds.push(shopId.trim());
					}
					$.log('获取店铺数据成功，一共获取到' + $.shopIds.length + '条数据');
				} else {
					$.log(`获取店铺数据失败`)
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve(data);
			}
		})
	});
}

function readShopId3() {
	return new Promise((resolve) => {
		$.get({
			url: 'https://gitee.com/curtinlv/Public/raw/master/OpenCard/shopid.txt'
		}, (err, resp, data) => {
			//https://ghproxy.com/https://raw.githubusercontent.com/AntonVanke/JDBrandMember/main/shopid.txt
			//https://ghproxy.com/https://raw.githubusercontent.com/small-redguy/helper/main/static/ydShopId.txt
			try {

				if (data) {
					var shoplist = JSON.parse(data);

					shoplist.forEach(shop => {
						if ($.shopIds.indexOf(shop.shopId) == -1) {
							$.shopIds.push(shop.shopId);
						}

					});

					$.log('获取店铺数据成功，一共获取到' + $.shopIds.length + '条数据');
				} else {
					$.log(`获取店铺数据失败`)
				}
			} catch (e) {
				$.log(e);
			} finally {
				resolve(data);
			}
		})
	});
}


// 来自 @chavyleung 大佬
// https://raw.githubusercontent.com/chavyleung/scripts/master/Env.js
function Env(name, opts) {
	class Http {
		constructor(env) {
			this.env = env
		}

		send(opts, method = 'GET') {
			opts = typeof opts === 'string' ? {
				url: opts
			} : opts
			let sender = this.get
			if (method === 'POST') {
				sender = this.post
			}
			return new Promise((resolve, reject) => {
				sender.call(this, opts, (err, resp, body) => {
					if (err) reject(err)
					else resolve(resp)
				})
			})
		}

		get(opts) {
			return this.send.call(this.env, opts)
		}

		post(opts) {
			return this.send.call(this.env, opts, 'POST')
		}
	}

	return new (class {
		constructor(name, opts) {
			this.name = name
			this.http = new Http(this)
			this.data = null
			this.dataFile = 'box.dat'
			this.logs = []
			this.isMute = false
			this.isNeedRewrite = false
			this.logSeparator = '\n'
			this.startTime = new Date().getTime()
			Object.assign(this, opts)
			this.log('', `${this.name}, 开始!`)
		}

		isNode() {
			return 'undefined' !== typeof module && !!module.exports
		}

		isQuanX() {
			return 'undefined' !== typeof $task
		}

		isSurge() {
			return 'undefined' !== typeof $httpClient && 'undefined' === typeof $loon
		}

		isLoon() {
			return 'undefined' !== typeof $loon
		}

		toObj(str, defaultValue = null) {
			try {
				return JSON.parse(str)
			} catch {
				return defaultValue
			}
		}

		toStr(obj, defaultValue = null) {
			try {
				return JSON.stringify(obj)
			} catch {
				return defaultValue
			}
		}

		getjson(key, defaultValue) {
			let json = defaultValue
			const val = this.getdata(key)
			if (val) {
				try {
					json = JSON.parse(this.getdata(key))
				} catch { }
			}
			return json
		}

		setjson(val, key) {
			try {
				return this.setdata(JSON.stringify(val), key)
			} catch {
				return false
			}
		}

		getScript(url) {
			return new Promise((resolve) => {
				this.get({
					url
				}, (err, resp, body) => resolve(body))
			})
		}

		runScript(script, runOpts) {
			return new Promise((resolve) => {
				let httpapi = this.getdata('@chavy_boxjs_userCfgs.httpapi')
				httpapi = httpapi ? httpapi.replace(/\n/g, '').trim() : httpapi
				let httpapi_timeout = this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout')
				httpapi_timeout = httpapi_timeout ? httpapi_timeout * 1 : 20
				httpapi_timeout = runOpts && runOpts.timeout ? runOpts.timeout : httpapi_timeout
				const [key, addr] = httpapi.split('@')
				const opts = {
					url: `http://${addr}/v1/scripting/evaluate`,
					body: {
						script_text: script,
						mock_type: 'cron',
						timeout: httpapi_timeout
					},
					headers: {
						'X-Key': key,
						'Accept': '*/*'
					}
				}
				this.post(opts, (err, resp, body) => resolve(body))
			}).catch((e) => this.logErr(e))
		}

		loaddata() {
			if (this.isNode()) {
				this.fs = this.fs ? this.fs : require('fs')
				this.path = this.path ? this.path : require('path')
				const curDirDataFilePath = this.path.resolve(this.dataFile)
				const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile)
				const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath)
				const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath)
				if (isCurDirDataFile || isRootDirDataFile) {
					const datPath = isCurDirDataFile ? curDirDataFilePath : rootDirDataFilePath
					try {
						return JSON.parse(this.fs.readFileSync(datPath))
					} catch (e) {
						return {}
					}
				} else return {}
			} else return {}
		}

		writedata() {
			if (this.isNode()) {
				this.fs = this.fs ? this.fs : require('fs')
				this.path = this.path ? this.path : require('path')
				const curDirDataFilePath = this.path.resolve(this.dataFile)
				const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile)
				const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath)
				const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath)
				const jsondata = JSON.stringify(this.data)
				if (isCurDirDataFile) {
					this.fs.writeFileSync(curDirDataFilePath, jsondata)
				} else if (isRootDirDataFile) {
					this.fs.writeFileSync(rootDirDataFilePath, jsondata)
				} else {
					this.fs.writeFileSync(curDirDataFilePath, jsondata)
				}
			}
		}

		lodash_get(source, path, defaultValue = undefined) {
			const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
			let result = source
			for (const p of paths) {
				result = Object(result)[p]
				if (result === undefined) {
					return defaultValue
				}
			}
			return result
		}

		lodash_set(obj, path, value) {
			if (Object(obj) !== obj) return obj
			if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || []
			path
				.slice(0, -1)
				.reduce((a, c, i) => (Object(a[c]) === a[c] ? a[c] : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {})), obj)[
				path[path.length - 1]
			] = value
			return obj
		}

		getdata(key) {
			let val = this.getval(key)
			// 如果以 @
			if (/^@/.test(key)) {
				const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
				const objval = objkey ? this.getval(objkey) : ''
				if (objval) {
					try {
						const objedval = JSON.parse(objval)
						val = objedval ? this.lodash_get(objedval, paths, '') : val
					} catch (e) {
						val = ''
					}
				}
			}
			return val
		}

		setdata(val, key) {
			let issuc = false
			if (/^@/.test(key)) {
				const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
				const objdat = this.getval(objkey)
				const objval = objkey ? (objdat === 'null' ? null : objdat || '{}') : '{}'
				try {
					const objedval = JSON.parse(objval)
					this.lodash_set(objedval, paths, val)
					issuc = this.setval(JSON.stringify(objedval), objkey)
				} catch (e) {
					const objedval = {}
					this.lodash_set(objedval, paths, val)
					issuc = this.setval(JSON.stringify(objedval), objkey)
				}
			} else {
				issuc = this.setval(val, key)
			}
			return issuc
		}

		getval(key) {
			if (this.isSurge() || this.isLoon()) {
				return $persistentStore.read(key)
			} else if (this.isQuanX()) {
				return $prefs.valueForKey(key)
			} else if (this.isNode()) {
				this.data = this.loaddata()
				return this.data[key]
			} else {
				return (this.data && this.data[key]) || null
			}
		}

		setval(val, key) {
			if (this.isSurge() || this.isLoon()) {
				return $persistentStore.write(val, key)
			} else if (this.isQuanX()) {
				return $prefs.setValueForKey(val, key)
			} else if (this.isNode()) {
				this.data = this.loaddata()
				this.data[key] = val
				this.writedata()
				return true
			} else {
				return (this.data && this.data[key]) || null
			}
		}

		initGotEnv(opts) {
			this.got = this.got ? this.got : require('got')
			this.cktough = this.cktough ? this.cktough : require('tough-cookie')
			this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()
			if (opts) {
				opts.headers = opts.headers ? opts.headers : {}
				if (undefined === opts.headers.Cookie && undefined === opts.cookieJar) {
					opts.cookieJar = this.ckjar
				}
			}
		}

		get(opts, callback = () => { }) {
			if (opts.headers) {
				delete opts.headers['Content-Type']
				delete opts.headers['Content-Length']
			}
			if (this.isSurge() || this.isLoon()) {
				if (this.isSurge() && this.isNeedRewrite) {
					opts.headers = opts.headers || {}
					Object.assign(opts.headers, {
						'X-Surge-Skip-Scripting': false
					})
				}
				$httpClient.get(opts, (err, resp, body) => {
					if (!err && resp) {
						resp.body = body
						resp.statusCode = resp.status
					}
					callback(err, resp, body)
				})
			} else if (this.isQuanX()) {
				if (this.isNeedRewrite) {
					opts.opts = opts.opts || {}
					Object.assign(opts.opts, {
						hints: false
					})
				}
				$task.fetch(opts).then(
					(resp) => {
						const {
							statusCode: status,
							statusCode,
							headers,
							body
						} = resp
						callback(null, {
							status,
							statusCode,
							headers,
							body
						}, body)
					},
					(err) => callback(err)
				)
			} else if (this.isNode()) {
				this.initGotEnv(opts)
				this.got(opts)
					.on('redirect', (resp, nextOpts) => {
						try {
							if (resp.headers['set-cookie']) {
								const ck = resp.headers['set-cookie'].map(this.cktough.Cookie.parse).toString()
								if (ck) {
									this.ckjar.setCookieSync(ck, null)
								}
								nextOpts.cookieJar = this.ckjar
							}
						} catch (e) {
							this.logErr(e)
						}
						// this.ckjar.setCookieSync(resp.headers['set-cookie'].map(Cookie.parse).toString())
					})
					.then(
						(resp) => {
							const {
								statusCode: status,
								statusCode,
								headers,
								body
							} = resp
							callback(null, {
								status,
								statusCode,
								headers,
								body
							}, body)
						},
						(err) => {
							const {
								message: error,
								response: resp
							} = err
							callback(error, resp, resp && resp.body)
						}
					)
			}
		}

		post(opts, callback = () => { }) {
			// 如果指定了请求体, 但没指定`Content-Type`, 则自动生成
			if (opts.body && opts.headers && !opts.headers['Content-Type']) {
				opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
			}
			if (opts.headers) delete opts.headers['Content-Length']
			if (this.isSurge() || this.isLoon()) {
				if (this.isSurge() && this.isNeedRewrite) {
					opts.headers = opts.headers || {}
					Object.assign(opts.headers, {
						'X-Surge-Skip-Scripting': false
					})
				}
				$httpClient.post(opts, (err, resp, body) => {
					if (!err && resp) {
						resp.body = body
						resp.statusCode = resp.status
					}
					callback(err, resp, body)
				})
			} else if (this.isQuanX()) {
				opts.method = 'POST'
				if (this.isNeedRewrite) {
					opts.opts = opts.opts || {}
					Object.assign(opts.opts, {
						hints: false
					})
				}
				$task.fetch(opts).then(
					(resp) => {
						const {
							statusCode: status,
							statusCode,
							headers,
							body
						} = resp
						callback(null, {
							status,
							statusCode,
							headers,
							body
						}, body)
					},
					(err) => callback(err)
				)
			} else if (this.isNode()) {
				this.initGotEnv(opts)
				const {
					url,
					..._opts
				} = opts
				this.got.post(url, _opts).then(
					(resp) => {
						const {
							statusCode: status,
							statusCode,
							headers,
							body
						} = resp
						callback(null, {
							status,
							statusCode,
							headers,
							body
						}, body)
					},
					(err) => {
						const {
							message: error,
							response: resp
						} = err
						callback(error, resp, resp && resp.body)
					}
				)
			}
		}
		/**
		 *
		 * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
		 *    :$.time('yyyyMMddHHmmssS')
		 *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
		 *    其中y可选0-4位占位符S可选0-1位占位符其余可选0-2位占位符
		 * @param {*} fmt 格式化参数
		 *
		 */
		time(fmt) {
			let o = {
				'M+': new Date().getMonth() + 1,
				'd+': new Date().getDate(),
				'H+': new Date().getHours(),
				'm+': new Date().getMinutes(),
				's+': new Date().getSeconds(),
				'q+': Math.floor((new Date().getMonth() + 3) / 3),
				'S': new Date().getMilliseconds()
			}
			if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (new Date().getFullYear() + '').substr(4 - RegExp.$1.length))
			for (let k in o)
				if (new RegExp('(' + k + ')').test(fmt))
					fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
			return fmt
		}

		/**
		 * 系统通知
		 *
		 * > 通知参数: 同时支持 QuanX 和 Loon 两种格式, EnvJs根据运行环境自动转换, Surge 环境不支持多媒体通知
		 *
		 * 示例:
		 * $.msg(title, subt, desc, 'twitter://')
		 * $.msg(title, subt, desc, { 'open-url': 'twitter://', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 * $.msg(title, subt, desc, { 'open-url': 'https://bing.com', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 *
		 * @param {*} title 标题
		 * @param {*} subt 副标题
		 * @param {*} desc 通知详情
		 * @param {*} opts 通知参数
		 *
		 */
		msg(title = name, subt = '', desc = '', opts) {
			const toEnvOpts = (rawopts) => {
				if (!rawopts) return rawopts
				if (typeof rawopts === 'string') {
					if (this.isLoon()) return rawopts
					else if (this.isQuanX()) return {
						'open-url': rawopts
					}
					else if (this.isSurge()) return {
						url: rawopts
					}
					else return undefined
				} else if (typeof rawopts === 'object') {
					if (this.isLoon()) {
						let openUrl = rawopts.openUrl || rawopts.url || rawopts['open-url']
						let mediaUrl = rawopts.mediaUrl || rawopts['media-url']
						return {
							openUrl,
							mediaUrl
						}
					} else if (this.isQuanX()) {
						let openUrl = rawopts['open-url'] || rawopts.url || rawopts.openUrl
						let mediaUrl = rawopts['media-url'] || rawopts.mediaUrl
						return {
							'open-url': openUrl,
							'media-url': mediaUrl
						}
					} else if (this.isSurge()) {
						let openUrl = rawopts.url || rawopts.openUrl || rawopts['open-url']
						return {
							url: openUrl
						}
					}
				} else {
					return undefined
				}
			}
			if (!this.isMute) {
				if (this.isSurge() || this.isLoon()) {
					$notification.post(title, subt, desc, toEnvOpts(opts))
				} else if (this.isQuanX()) {
					$notify(title, subt, desc, toEnvOpts(opts))
				}
			}
			if (!this.isMuteLog) {
				let logs = ['', '==============系统通知==============']
				logs.push(title)
				subt ? logs.push(subt) : ''
				desc ? logs.push(desc) : ''
				process.stdout.write(logs.join('\n'))
				process.stdout.write(messages)

				this.logs = this.logs.concat(logs)
			}
		}

		log(...logs) {
			if (logs.length > 0) {
				this.logs = [...this.logs, ...logs]
			}
			console.log(logs.join(this.logSeparator))
		}

		logErr(err, msg) {
			const isPrintSack = !this.isSurge() && !this.isQuanX() && !this.isLoon()
			if (!isPrintSack) {
				this.log('', `${this.name}, 错误!`, err)
			} else {
				this.log('', `${this.name}, 错误!`, err.stack)
			}
		}

		wait(time) {
			return new Promise((resolve) => setTimeout(resolve, time))
		}

		done(val = {}) {
			const endTime = new Date().getTime()
			const costTime = (endTime - this.startTime) / 1000
			this.log('', `${this.name}, 结束!  ${costTime} 秒`)
			this.log()
			if (this.isSurge() || this.isQuanX() || this.isLoon()) {
				$done(val)
			}
		}
	})(name, opts)
}
