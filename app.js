const http = require('http')
const Bot = require('messenger-bot')
const parseString = require('xml2js').parseString;
const request = require('request');


let bot = new Bot({
  token: 'TOKEN',
  verify: 'VERIFY_TOKEN',
  app_secret: 'APP_SECRET'
})

let disk = [];


function testFeedUrl(url, callback){
  request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          parseString(body, function (err, result) {
              var findChannel = function(obj){
                if(typeof obj['channel'] !== 'undefined'){
                  return obj['channel']
                } else {
                  return findChannel(obj[Object.keys(obj)[0]])
                }
              }
              if(callback) callback(findChannel(result));
          });
      }
  });
}



bot.on('error', (err) => {
  console.log(err.message)
})





bot.on('message', (payload, reply) => {
  let text = payload.message.text


  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

    if("undefined" === typeof disk[payload.sender.id]){
      disk[payload.sender.id] = {
        id: payload.sender.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_pic: profile.profile_pic,
        locale: profile.locale,
        gender: profile.gender,
        timezone: profile.timezone,
        step: 0
      }
    }

    let message, step = disk[payload.sender.id].step, botSign = "#FeedcastBot";

    switch(step){
      case 0: //first step, the hello message
        message = `Olá ${profile.first_name}! Envie a URL do feed e nós cuidaremos do resto para você! \n\n ${botSign}`;
        disk[payload.sender.id].step = 1
        reply({ text: message }, (err) => {
          if (err) throw err
        });
      break;
      case 1://the step where we indentify the url
        let arrayUrls = text.split(' ').filter(e => /((http|https)\:\/\/)?[a-zA-Z0-9\.\/\?\:@\-_=#]+\.([a-zA-Z0-9\&\.\/\?\:@\-_=#])*/gi.exec(e) !== null );

        if(arrayUrls.length === 0){
          message = `Qual a url do feed que você deseja adicionar? \n\n ${botSign}`
          reply({ text: message }, (err) => {
            if (err) throw err
          });
        } else {
          testFeedUrl(arrayUrls[0], function(xmlParsed){
            message = `Tem certeza que deseja adicionar ${xmlParsed[0].title[0]}? \n\n ${botSign}`;
            reply({ text: message }, (err) => {
              if (err) throw err
            });
          })
        }
      break;
    }
  })
})

http.createServer(bot.middleware()).listen(3000)
console.log('Echo bot server running at port 3000.')