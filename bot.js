const http = require('http')
const Bot = require('messenger-bot')
const parseString = require('xml2js').parseString;
const request = require('request');


let bot = new Bot({
  token: process.env.TOKEN,
  verify: process.env.VERIFY,
  app_secret: process.env.APP_SECRET
})

let disk = [];


function testFeedUrl(url, callback){
  try{
  if(url.indexOf('http') === -1) url = `http://${url}`;
  request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          parseString(body, function (err, result) {
              if(err) {
                callback(null, true, err);
              } else {
                var findChannel = function(obj){
                  if(typeof obj['channel'] !== 'undefined'){
                    return obj['channel']
                  } else {
                    return findChannel(obj[Object.keys(obj)[0]])
                  }
                }
                callback(findChannel(result));
              }
          });
      } else {
        callback(null, true, error);
      }
  });
  } catch(e){
    callback(null, true, e);
  }
}

function findSome(arrayWords, stringText){
  let text = stringText.toLowerCase();
  for(let i in arrayWords)
    if(text.indexOf(arrayWords[i]) !== -1)
      return true
  return false
}

bot.on('error', (err) => {
  console.log(err.message)
})





bot.on('message', (payload, reply) => {
  let text = payload.message.text


  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) console.log(err)

    if("undefined" === typeof disk[payload.sender.id]){
      disk[payload.sender.id] = {
        id: payload.sender.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_pic: profile.profile_pic,
        locale: profile.locale,
        gender: profile.gender,
        timezone: profile.timezone,
        step: -1,
        try:0,
        time: Date.now()
      }
    }

    let message, step = disk[payload.sender.id].step, botSign = "#FeedBot";

    switch(step){
      case -1:
        message = `Olá ${profile.first_name}! Você deseja enviar um feed para nosso catalogo? \n\n ${botSign}`;
        disk[payload.sender.id].step = 0
        reply({ text: message }, (err) => {
          if (err) console.log(err)
        });
      break;
      case 0: //first step, the hello message
      if(findSome(['sim','yes','por favor', 'claro', 'sin', 'ok', 'beleza', 'blz', 'ta bom'],text)){
        message = `Beleza! Basta enviar a URL do feed e nós cuidaremos do resto para você! \n\n ${botSign}`;
        disk[payload.sender.id].step = 1
      } else {
        message = `Como podemos te ajudar? \n\n ${botSign}`;
        disk[payload.sender.id].step = 4
      }
      reply({ text: message }, (err) => {
        if (err) console.log(err)
      });
      break;
      case 1://the step where we indentify the url
        let arrayUrls = text.split(' ').filter(e => /((http|https)\:\/\/)?[a-zA-Z0-9\.\/\?\:@\-_=#]+\.([a-zA-Z0-9\&\.\/\?\:@\-_=#])*/gi.exec(e) !== null );

        if(arrayUrls.length === 0){
          if(disk[payload.sender.id].try >= 10){
            message = `Como podemos te ajudar? \n\n ${botSign}`
            disk[payload.sender.id].step = 4
          } else {
            message = `Qual a url do feed que você deseja adicionar? \n\n ${botSign}`
            disk[payload.sender.id].try += 1
          }
          reply({ text: message }, (err) => {
            if (err) console.log(err)
          });
        } else {
          testFeedUrl(arrayUrls[0], (xmlParsed, error) => {
            if(error){
              message = `Encontramos um problema no seu feed. Deseja enviar outra url? \n\n ${botSign}`;
            } else {
              message = `Tem certeza que deseja adicionar ${xmlParsed[0].title[0]}? \n\n ${botSign}`;
              disk[payload.sender.id].step = 2
            }
            reply({ text: message }, (err) => {
              if (err) console.log(err)
            });
          })
        }
      break;
      case 2:
      if(findSome(['sim','yes','por favor', 'claro', 'sin', 'ok', 'beleza', 'blz', 'ta bom'],text)){
        message = `Muito obrigado por enviar a sua contribuição ao Feedcast! Seu feed será enviado para aprovação e em breve poderá ser adicionado ao nosso catalogo! \n\n ${botSign}`;
        disk[payload.sender.id].step = -1
      } else {
        message = `Deseja adicionar outro feed? \n\n ${botSign}`;
        disk[payload.sender.id].step = 3
      }
      reply({ text: message }, (err) => {
        if (err) console.log(err)
      });
      break;
      case 3:
        if(findSome(['sim','yes','por favor', 'claro', 'sin', 'ok', 'beleza', 'blz', 'ta bom'],text)){
          message = `Qual a url do feed que você deseja adicionar? \n\n ${botSign}`
          disk[payload.sender.id].step = 1
        } else {
          message = `Algo mais que possamos te ajudar? \n\n ${botSign}`
          disk[payload.sender.id].step = 4
        }
        reply({ text: message }, (err) => {
          if (err) console.log(err)
        });
      break;
      case 4://Atendimento concluido
        disk[payload.sender.id].step = -1
        reply({ text: `Qualquer dúvida você pode nos consultar também pelo twitter @feedcast_ \n\n ${botSign}` }, (err) => {
          if (err) console.log(err)
        });
      break;
    }
  })
})

http.createServer(bot.middleware()).listen(process.env.PORT || 3000)
console.log(`Echo bot server running at port ${process.env.PORT || 3000}`)
