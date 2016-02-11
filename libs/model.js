var Model = function(redis) {

  const process = (data) => {
    const transformed = data.users.map(u => {
      u.replyCount = 0;
      return u;
    });
    data.users = transformed;
    return data;
  };

  const retrieve = () => {
    try {
      redis.open();
      const user = redis.rpoplpush("users");
      process(user);
    }
    finally{
      redis.close();
    }
  }

  return {
    retrieve: retrieve,
    process: process
  }
};

console.log(Model);
var foo = new Model({});

module.exports = Model;
