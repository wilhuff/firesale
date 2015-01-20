var MainCtrl = require('./lib/main');
var CommandProcessor = require('./lib/commands');
var PromisedFirebase = require('./lib/fbpromise');

var Firebase = require('firebase');
var FirebaseTokenGenerator = require("firebase-token-generator");

var fs = require('fs');

function main() {
  fs.readFile('secret.json', function(err, secret) {
    if (err) {
      console.log('Failed to read secret file: ' + err);
      process.exit(2);
    }

    secret = JSON.parse(secret);

    var tokenGenerator = new FirebaseTokenGenerator(secret.secret);
    var token = tokenGenerator.createToken({uid: "system", system: true});

    var root = new Firebase('https://burning-inferno-9409.firebaseio.com/');
    root.authWithCustomToken(token, function(err, authData) {
      if (err) {
        console.log('Failed to authenticate to Firebase using a secret: ' + err);
        process.exit(2);
      }

      var promised = new PromisedFirebase(root);
      var main = new MainCtrl(promised);
      var commands = new CommandProcessor(main);

      commands.processArgv();
    });

  });
}

main();
