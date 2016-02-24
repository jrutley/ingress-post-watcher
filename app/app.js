const Rx = require('rx');
const Redis = require('../libs/redis-access.js');
const app = require('./logic.js');
const envVars = require('../env.conf.json');

var source = Rx.Observable
.interval(500 /* ms */)
.timeInterval()
//.take(3)

const apiKeys = envVars.API_KEYS;
var connection = null
var subscription = source.subscribe(
  next => {
    if(connection === null){
      connection = new Redis()
      Rx.Observable.fromEvent(connection, "connect").subscribe(c=>{console.log("APP connect")});
      //Rx.Observable.fromEvent(connection, "idle").subscribe(i=>{console.log("APP redis idle")});
      Rx.Observable.fromEvent(connection, "reconnecting").subscribe(r => {
        console.log("APP reconnecting... Delay: " + r.delay + "ms Attempt: "+ r.attempt);
      });
      Rx.Observable.fromEvent(connection, "error").subscribe(e=>{console.log("APP redis error: " + e)});
      Rx.Observable.fromEvent(connection, "end").subscribe(e=>{console.log("APP redis end")});
      Rx.Observable.fromEvent(connection, "drain").subscribe(d=>{console.log("APP redis drain")});
    }
    connection.rpoplpush("users", "users", (err, value)=>{
      app(apiKeys[next.value % apiKeys.length], value, connection);
    });
  },
  err => {
    console.log('APP RX Error: ' + err);
    connection.quit()
    connection = null
  },
  () => {
    console.log('APP RX Completed');
    var subscription = Rx.Observable.fromEvent(connection, "idle").bufferWithTime(5000).subscribe(i=>{
      console.log("APP redis idle")
      connection.quit()
      connection = null
      subscription.dispose()
    });
  }
);
