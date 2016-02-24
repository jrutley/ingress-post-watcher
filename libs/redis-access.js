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
    connection = redis.createClient(args);

    console.log("REDIS: open on " + args.host + ":"+ args.port);

    connection.auth(pass || envVars.REDIS_PASS);

    return connection;
  }

  return self.open(server, port, pass)
}

module.exports = Redis
