const envVars = require('../env.conf.json');
const redis = require('redis');

var opened = false;

function open(server, port, pass) {
  console.log("Opening connection");
  const connection = redis.createClient({
    port: port || envVars.REDIS_PORT,
    host: server || envVars.REDIS_SERVER
  });

  console.log("open: " + connection);
  opened = true;

  connection.on("error", function (err) {
      console.log("Redis client Error " + err);
      opened = false;
  });

  connection.auth(pass || envVars.REDIS_PASS);
  return connection;
}

function close(connection) {
  connection.quit();
  opened = false;
}

function rpoplpush(connection, sourceKey, destinationKey, callback) {
  //console.log("rpoplpush: " + connection);
  if(!connection){
    throw "open wasn't called";
  }
  if(!opened){
    open();
  }
  connection.send_command("rpoplpush", [sourceKey, destinationKey], (err, res) => {
    if(err !== null){
      console.log("rpoplpush error: " + err);
    } else {
      // console.log(res);
      callback(res);
    }
  });
}

function retrieve(connection, collection, callback){
  rpoplpush(connection, collection, collection, callback);
}


module.exports = {
  open: open,
  close: close,
  retrieve: retrieve
}
