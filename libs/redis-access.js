const envVars = require('../env.conf.json');
const redis = require('redis');

var connection = null;

function Redis(server, port, pass){
  const self = this;
  // hide "new"
  if (!(this instanceof Redis)) return new Redis(server, port, pass);

  self.open = function(server, port, pass) {
    const args = {
      port: port || envVars.REDIS_PORT,
      host: server || envVars.REDIS_SERVER
    };
    console.log("REDIS: opening on " + args.host + ":"+ args.port);
    connection = redis.createClient(args);

    console.log("REDIS: open on " + args.host + ":"+ args.port);

    var redisAuth = pass || envVars.REDIS_PASS;
    if(redisAuth){
      connection.auth(pass || envVars.REDIS_PASS);
    } else {
      console.log("No Redis authentication");
    }

    return connection;
  }

  return self.open(server, port, pass)
}

module.exports = Redis
