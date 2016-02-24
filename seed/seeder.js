const users = require('./plususers.json');
const redis = require('../libs/redis-access.js');
const Rx = require('rx')

// redis.execute( (connection) => {
//   users.users.forEach(u=> {
//     connection.rpush("users", JSON.stringify(u));
//   });
// })

var connection = null;
try {
  connection = redis();
  users.users.forEach(u=> {
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
