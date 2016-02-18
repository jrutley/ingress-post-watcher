module.exports = Processing

function Processing (redis, gplus) {
  const self = this;
  // hide "new"
  if (!(this instanceof Processing)) return new Processing(opt);

  self.gplus = gplus


  // returnedUser is a G+ user
  self.getDetails = (returnedUser) => {
    gplus.activities.list({'userId': returnedUser, 'collection': 'public'}, function(err,res){

      redis.hgetall(returnedUser, (err, getresult) =>{
        if(getresult === null) {
          redis.hmset(
            returnedUser,
            // commentid, # of replies, post update date?
            "postId", res.items[0].id,
            "replies", res.items[0].object.replies.totalItems,
            "postDate", res.items[0].updated
          )
        }
      })
    });
  }
}
