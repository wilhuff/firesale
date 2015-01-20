
## Setup

### System

You need a few things to build and run this

  * [Node.js](http://nodejs.org/)
  * Grunt
  * Bower
  * A Firebase demo account

On Ubuntu that would be

    sudo apt-get install nodejs
    sudo npm install -g grunt-cli bower


### Firebase

  * Create a new application
  * Go find your authorization secret in the control panel
  * Create a file containing the secret and firebase URL in `sim/secret.json`:

        {
          "secret": "your secret here",
          "firebase": "http://your-firebase.firebaseio.com/"
        }

  * TODO(wilhuff): Import security rules
  * Actual users can self-register on the website


### Source tree

  * Download packages

        npm install
        bower install
        (cd sim; npm install)


## Running

Once you have an environment going, do this:

  * In one window, start the backend

        (cd sim; nodejs app.js)

  * In another window, start a web server. This will also open a browser
    pointing at [the local host](http://localhost:9000/).

        grunt serve

