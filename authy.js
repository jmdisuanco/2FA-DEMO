/*
Name: Authy Client
Written by: John Martin R. Disuanco
Date: May 13, 2017
*/
let qs = require('qs')
let request = require('request-promise')
let crypto = require('crypto')
let config = require('./config')
register = function (email,cellphone,countryCode){
  // https://api.authy.com/protected/{FORMAT}/users/new?api_key={KEY}
  return request.post({uri:'https://api.authy.com/protected/json/users/new?api_key=' + this.apiKey,
            body: {user: {
                           email: email,
                           cellphone: cellphone,
                           country_code: countryCode
                         }
            },
            json: true
           }).then(function (parsedBody) {
                return parsedBody.user.id
            })
            .catch(function(err){
              console.log('Something went wrong, probably API key mismatch')
            })

  function getAuthyID(body){
       return body.user.id
  }
}

verifySoftToken = function(token,authyID){
    console.log(token)
  //  GET https://api.authy.com/protected/{FORMAT}/verify/{TOKEN}/{AUTHY_ID}?api_key={KEY}
    return request.get({uri:'https://api.authy.com/protected/json/verify/' + token + '/' + authyID + '?api_key=' + this.apiKey,
              json: true
             }).then(function (parsedBody) {
                  // console.log('error:', error);
                  // console.log('statusCode:', response && response.statusCode);
                  console.log('body:', parsedBody);
                  //return parsedBody.user.id
              }).catch( function(parsedBody){
                console.log(parsedBody)
                return false
              })
}

oneTouchRequest = function(message,details,authyID){
    // POST https://api.authy.com/onetouch/{FORMAT}/users/2/approval_requests?api_key={KEY}
    return request.post({uri:'https://api.authy.com/onetouch/json/users/'+ authyID +'/approval_requests',
              body:{
                    api_key: this.apiKey,
                    message: message,
                    details: details,
                    seconds_to_expire: 60
              },
              headers: {
              'X-Authy-API-Key': this.apiKey
          },
              json: true
            })
            .then(function(parsedBody){
              console.log(parsedBody)
            })
            .catch((err) => {console.log(err)})
}
verifyCallback = function(req){
    let url = config.callbackURL
    let method = req.method
    let nonce = req.headers["x-authy-signature-nonce"]
    let sorted_params = qs.stringify(req.query, { arrayFormat: 'brackets' }).split("&").sort(sortByPropertyOnly).join("&").replace(/%20/g, '+')
    let data = nonce + "|" + req.method + "|" + url + "|" + sorted_params
    let computed_sig = crypto.createHmac('sha256', this.apiKey).update(data).digest('base64')
    let sig = req.headers["x-authy-signature"]
    return sig == computed_sig
}

function sortByPropertyOnly(x, y){
      let xx = x.split("=")
      let yy = y.split("=")

    if (xx < yy) {
        return -1
    }
    if (xx > yy) {
        return 1
    }
    return 0
}

module.exports = {
    apiKey : '',
    register: register,
    verifySoftToken : verifySoftToken,
    oneTouchRequest: oneTouchRequest,
    verifyCallback: verifyCallback

}
