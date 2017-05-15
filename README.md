## Synopsis

A Web Application Demo Showcasing the Following:
* Simple Signup Form with Validation
    * Validate and sanitize inputs
    * bcrypt is used for software hashing
    * to easily deploy for demo purposes I have used NeDB for no install DB which is based on MongoDB query sets  

## What is this made up of?

This is Web Application is is made up of the following stack:

#### BACKEND
+ NodeJS for the backend
+ ExpressJS for serving HTML and REST API
+ Socket.io for real-time client server communication

#### FRONTEND
+ HTML
+ jQuery / JS
+ Socket io for client
+ Material Design Lite for UI framework


#### Why did you code this way

Fo the frontend the code in a way that it is untangled and can be checked by the reviewer in a easy manner like minimal and inline CSS.


## Installation

+ `git clone https://github.com/jmdisuanco/2FA-DEMO.git`  
+ `cd 2FA-DEMO`
+  `'secret': 'PLEASE',
    'callbackURL': 'https://[CHANGE_THIS].ngrok.io/onetouch/endpoint',
    'authyApiKey': '[CHANGE_THIS]',
    'port': 8080`
+ Login to https://dashboard.authy.com
+ `nodemon server`
+ run `ngrok http 8080` on another terminal

## Contributors

John Martin R. Disuanco

## License
MIT
