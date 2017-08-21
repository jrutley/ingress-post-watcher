const users = require('./ver.json');
console.log("Importing Redis");
const redis = require('../libs/redis-access.js');
const Rx = require('rx')

var connection = null;
try {
  connection = redis();
  users.users.forEach(u=> {
    console.log(u);
    connection.rpush("users", JSON.stringify(u));
  });
}
finally{
  var subscription = Rx.Observable.fromEvent(connection, "idle").subscribe(e=>{
    console.log("Redis idle")
    if(connection !== null) {
      subscription.dispose()
      connection.quit()
      connection = null
    }
  });
}
