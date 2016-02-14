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
        // if(connection !== null){
        //   connection.quit();
        // }
        // connection = null;
      });
      connection.on("reconnecting", (r) => {
        console.log("APP reconnecting... Delay: " + r.delay + "ms Attempt: "+ r.attempt);
      })
    }
    redis.retrieve(connection, "users", (value)=>{
      app(apiKeys[next.value % apiKeys.length], value);
    });
  },
  err => {
    console.log('APP RX Error: ' + err);
    redis.close(connection);
    connection = null;
  },
  () => {
    console.log('APP RX Completed');
    redis.close(connection);
  }
);
