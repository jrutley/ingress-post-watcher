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
            "postId", res.id,
            "replies", res.object.replies.totalItems,
            "postDate", res.updated
          )
        }
      })
    });
  }
}
