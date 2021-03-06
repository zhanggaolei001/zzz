/*
京喜农场 Tokens
此文件为Node.js专用。其他用户请忽略
支持京东N个账号
 */
// 每个账号 token 是一个 json，示例如下
// {"farm_jstoken":"ce16565d3e5d95de7aecbca1abf2bc21","timestamp":"1624764839381","phoneid":"1a6b56a14ed8b089"}
let JxncTokens = [
    '{"farm_jstoken":"deb127680255b3f3a6820efa9c87beff","timestamp":"1625476176806","phoneid":"c6a2dd939a8fda6d3020f694e79cf6317714f058"}',//账号一的京喜农场token
 
  ]
  // 判断github action里面是否有京喜农场 token 
  if (process.env.JXNCTOKENS) {
    if (process.env.JXNCTOKENS.indexOf('&') > -1) {
      console.log(`您的京喜农场 token 选择的是用&隔开\n`)
      JxncTokens = process.env.JXNCTOKENS.split('&');
    } else if (process.env.JXNCTOKENS.indexOf('\n') > -1) {
      console.log(`您的京喜农场 token 选择的是用换行隔开\n`)
      JxncTokens = process.env.JXNCTOKENS.split('\n');
    } else {
      JxncTokens = process.env.JXNCTOKENS.split();
    }
  } else if (process.env.JD_COOKIE) {
    console.log(`由于您secret里面未提供 tokens，当种植 APP 种子时，将不能正常进行任务，请提供 token 或 种植非 APP 种子！`)
  }
  JxncTokens = [...new Set(JxncTokens.filter(item => !!item))]
  for (let i = 0; i < JxncTokens.length; i++) {
    const index = (i + 1 === 1) ? '' : (i + 1);
    exports['JXNCTOKEN' + index] = JxncTokens[i];
  }
  
  