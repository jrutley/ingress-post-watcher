const envVars = require('../env.conf.json');
const redis = require('redis');

var connection = null;

function open(server, port, pass) {
  const args = {
    port: port || envVars.REDIS_PORT,
    host: server || envVars.REDIS_SERVER
  };
  connection = redis.createClient(args);

  console.log("REDIS: open on " + args.host + ":"+ args.port);

  connection.auth(pass || envVars.REDIS_PASS);
  return connection;
}

function close(connection) {
  if(connection !== null) {
    connection.quit();
    console.log("REDIS: Successful close");
  } else {
    console.log("REDIS: close: connection was null");
  }
}

function rpoplpush(connection, sourceKey, destinationKey, callback) {
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

function retrieve(connection, collection, callback){
  rpoplpush(connection, collection, collection, callback);
}


module.exports = {
  open: open,
  close: close,
  retrieve: retrieve
}
