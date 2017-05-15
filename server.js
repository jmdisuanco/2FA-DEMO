const config = require('./config')
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser')
const path = require('path')
const dataPath = path.join(__dirname + '/data/users.db')
const Datastore = require('nedb')
  , db = new Datastore({ filename: dataPath, autoload: true })
db.ensureIndex({fieldName: 'email', unique: true })
const sanitizer = require('sanitizer')
const authy = require('./authy')
const cookieParser = require('cookie-parser')
var validator = require('validator')
var user = {}

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'John!' });
  // socket.on('my other event', function (data) {
  //   console.log(data)
  // })
  socket.on('room', function(room) {
       socket.join(room);
   });
})

authy.apiKey=config.authyApiKey

app.set('jwtSecret', config.secret)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({ type: 'application/*+json' }))
app.use(cookieParser())
app.io = io;
app.get('/', function(req,res){
  res.sendFile(path.join(__dirname + '/public/index.html'))
})

// app.get('/test', function(req,res){
//    //req.app.io.join(user.authyID);
//    console.log(user.authyID)
//       req.app.io.in('41721766').emit('message', {key:"has room"});
//       req.app.io.emit('message', {key:"no room"});
//       res.sendStatus(200)
// })

app.get('/softToken', function(req,res){
  res.sendFile(path.join(__dirname + '/public/softToken.html'))
})

app.get('/oneTouch', function(req,res){
  res.sendFile(path.join(__dirname + '/public/oneTouch.html'))
})

app.post('/verifyToken', function(req,res) {
       authy.verifySoftToken(req.body.token,user.authyID)
       .then(function(result){
         if(result === false){
           respond('error','Token is invalid',res)
         } else{
           respond('ok',issueJWT(user._id),res)
         }
       }

       )
})

app.post('/', function(req,res){
  // Capture Data and Sanitize
  console.log('logging in...')
  let email = req.body.email
  let emailfield = sanitizer.sanitize(req.body.email)
  if(validator.isEmail(emailfield)){ //Validate if in correct email format
  let email = emailfield
  let pass = sanitizer.sanitize(req.body.password)
  // Check for user if exist via email
  db.findOne({ email: email}, function (err, docs) {
    if(err){
      console.log('There was an error in the user database')
    } else {
      if (docs == null){
        respond('error','username and password error',res)
      }else{
        // Now check for the challenge the password
        hash = docs.password
        //Check for 2 Factor Authentication Option
        tfa = docs.tfa
        bcrypt.compare(pass, hash).then(function(result) {
          if(result === true){
            user = docs
            // No Two Factor authentication
              if(tfa === 'false' || tfa === undefined){
                respond('ok',issueJWT(docs._id),res)
              }
            // SoftToken
            console.log('this stage...')
            if(tfa === 'SoftToken'){
              console.log('softoken')
              let message = {
                url: 'softToken'
              }
              respond('redirect',message,res)
              //res.sendFile(path.join(__dirname + '/public/softToken.html'))
            }
            // OneTouch
            if(tfa === 'OneTouch'){
              let message = 'Login Request'
              let details = {
                userid: user._id,
                name: user.name,
                email: user.email
              }
              authy.oneTouchRequest(message,details,user.authyID)
              .then(function(){
                let message = {
                  url: 'oneTouch',
                  payload: user.authyID
                }
                respond('redirect',message,res)
                //res.sendFile(path.join(__dirname + '/public/oneTouch.html'))
              })

            }
          } else {
            respond('error','username and password error',res)
          }
      });

      }
    }
});

 } else{
   respond('error','invalid email format',res)
 }
})

app.get('/user',function(req,res){
  console.log(res.cookies)
  let token = req.cookies.accessToken
  jwt.verify(token, config.secret, function(err, userid) {
    if(err){
      respond('error','unAuthenticated session',res)
    }else{
      db.findOne({ _id: userid}, function (err, docs) {
        respond('ok',docs,res)
      })
    }

  });
})
app.get('/tfa',function(req,res){
  let token = req.cookies.accessToken
  jwt.verify(token, config.secret, function(err, userid) {
    if(err){
      console.log(err)
      respond('error','unAuthenticated session',res)
    }else{
      db.update({ _id: userid }, { $set: { tfa: req.query.tfa } }, { multi: false }, function (err, numReplaced) {
       console.log(numReplaced)
       respond('ok','TFA Set to '+req.query.tfa,res)
      });

    }

  });
})


app.get('/register', function(req,res){
  res.sendFile(path.join(__dirname + '/public/register.html'))
})

app.get('/onetouch/endpoint',function(req,res){
  let JWTtoken =''
  res.sendStatus(200)
  console.log(authy.verifyCallback(req))
  if(authy.verifyCallback(req)){
    console.log(user.authyID)
    //console.log(req.query)
    let transaction = req.query.approval_request.transaction
    console.log(transaction)
    if(transaction.message === 'Login Request'){
      if(transaction.status == 'approved'){
        JWTtoken = issueJWT(transaction.details.userid)
      }
      let message = {
        transaction: 'login',
        status: transaction.status,
        token: JWTtoken
      }
      req.app.io.in(user.authyID).emit('message', message);
    }else{
      let message ={
        status: 'update'
      }
      req.app.io.in(user.authyID).emit('message', message);
    }
  }

})

app.get('/dashboard', function(req,res){
  let token = req.cookies.accessToken
  res.sendFile(path.join(__dirname + '/public/dashboard.html'))
  jwt.verify(token, config.secret, function(err, userid) {
    if(err){
      res.redirect('/') //redirect to homepage
    }else{
      console.log(userid)
    }

  });
})

app.post('/register', function(req,res){
  let errorState = false
  let newUser = {}
  let emailfield = sanitizer.sanitize(req.body.email)
  if(validator.isEmail(emailfield)) {
    newUser.email = emailfield
  }else{
    respond('error','invalid email address',res)
    errorState = true
  }
let mobilefield = sanitizer.sanitize(req.body.mobile)
console.log(mobilefield)
  newUser.mobile = mobilefield
  newUser.password = bcrypt.hashSync(sanitizer.sanitize(req.body.password), 10)
  if(newUser.password != null && errorState == false){
    newUser.tfa = false
    authy.register(newUser.email,newUser.mobile,'+971')
    .then(function(result){
      newUser.authyID = result
      db.insert(newUser, function (err, newDoc) {
        if(err) {
          console.log('Sorry, but email is already registered')
          respond('error','Sorry, but email is already registered',res)
        }else {
          respond('ok','',res)
        }
      })
    })
  }else{
    console.log(newUser.password)
    respond('error','Check the details',res)
  }

})

function issueJWT(userid){
  let token = jwt.sign(userid, app.get('jwtSecret'), {
          //expiresInMinutes: 1440 // expires in 24 hours
        });
  return token
}

function respond(status,details,res){
  let message = {
    status: status,
    message: details
  }
  res.send(message)
}

server.listen(config.port, function(){
  console.log('Demo App is liseting on PORT :' + config.port)
})
