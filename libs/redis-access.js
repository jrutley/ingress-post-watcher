const envVars = require('../env.conf.json');
const redis = require('redis');

function Redis(){
  const self = this;
  // hide "new"
  if (!(this instanceof Redis)) return new Redis();

  var connection = null;

  self.open = function(server, port, pass) {
    const args = {
      port: port || envVars.REDIS_PORT,
      host: server || envVars.REDIS_SERVER
    };
    connection = redis.createClient(args);

    console.log("REDIS: open on " + args.host + ":"+ args.port);

    connection.auth(pass || envVars.REDIS_PASS);
    return connection;
  }

  self.close = function(connection) {
    if(connection !== null) {
      connection.quit();
      console.log("REDIS: Successful close");
    } else {
      console.log("REDIS: close: connection was null");
    }
  }

  self.rpoplpush = function(connection, sourceKey, destinationKey, callback) {
    try {
      connection.send_command("rpoplpush", [sourceKey, destinationKey], (err, res) => {
        if(err !== null){
          console.log("REDIS: rpoplpush error: " + err);
        } else {
          // console.log(res);
          callback(res);
        }
      });
    } catch (e){
      console.log("REDIS: Caught " + e);
    }
  }

  self.hgetall = function(key, response){
    connection.hgetall(key, response)
  }
  self.lrange = function(key, min, max, response){
    connection.lrange(key, min, max, response)
  }
  self.lpush = function(key, value, response){
    connection.lpush(key, value, response)
  }
  self.hmset = function(key, args){
    connection.hmset(key, args)
  }
  self.hset = function(key, args){
    connection.hset(key, args)
  }
}

module.exports = Redis
// {
//   open: open,
//   close: close,
//   retrieve: retrieve,
//     hgetall: connection.hgetall,
//     lrange: connection.lrange,
//     lpush: connection.lpush,
//     hmset: connection.hmset
// }
