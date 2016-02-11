const users = require('./plususers.json');
const redis = require('../libs/redis-access.js');

// redis.execute( (connection) => {
//   users.users.forEach(u=> {
//     connection.rpush("users", JSON.stringify(u));
//   });
// })

try {
  redis.open();
  users.users.forEach(u=> {
    redis.rpush("users", JSON.stringify(u));
  });
}
finally{
  redis.close();
}
