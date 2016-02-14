const Rx = require('rx');
const redis = require('../libs/redis-access.js');
const app = require('./logic.js');
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

      Rx.Observable.fromEvent(connection, "connect").subscribe(c=>{console.log("APP connect")});
      //Rx.Observable.fromEvent(connection, "idle").subscribe(i=>{console.log("APP redis idle")});
      Rx.Observable.fromEvent(connection, "reconnecting").subscribe(r => {
        console.log("APP reconnecting... Delay: " + r.delay + "ms Attempt: "+ r.attempt);
      });
      Rx.Observable.fromEvent(connection, "error").subscribe(e=>{console.log("APP redis error: " + e)});
      Rx.Observable.fromEvent(connection, "end").subscribe(e=>{console.log("APP redis end")});
      Rx.Observable.fromEvent(connection, "drain").subscribe(d=>{console.log("APP redis drain")});
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
