const Rx = require('rx');
const redis = require('../libs/redis-access.js');
const app = require('./connection.js');
const envVars = require('../env.conf.json');

var source = Rx.Observable
  .interval(500 /* ms */)
  .timeInterval();

const apiKeys = envVars.API_KEYS;
const connection = redis.open();
var subscription = source.subscribe(
  next => {
    redis.retrieve(connection, "users", (value)=>{
      app(apiKeys[next.value % apiKeys.length], value);
    });
  },
  err => {
    console.log('Error: ' + err);
    redis.close(connection);
  },
  () => {
    console.log('Completed');
    redis.close(connection);
  }
);
