const Rx = require('rx');
const redis = require('../libs/redis-access.js');
const app = require('./connection.js');
const envVars = require('../env.conf.json');

var source = Rx.Observable
  .interval(250 /* ms */)
  .timeInterval();

const apiKeys = envVars.API_KEYS;
var connection = null;
var subscription = source.subscribe(
  next => {
    if(connection === null){
      connection = redis.open();
      connection.on("error", function(err){
        console.log("APP connection error: " + err);
        connection.quit();
        connection = null;
      });
    }
    redis.retrieve(connection, "users", (value)=>{
      app(apiKeys[next.value % apiKeys.length], value);
    });
  },
  err => {
    console.log('Error: ' + err);
    redis.close(connection);
    connection = null;
  },
  () => {
    console.log('Completed');
    redis.close(connection);
  }
);
