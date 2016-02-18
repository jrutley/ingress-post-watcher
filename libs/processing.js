module.exports = Processing

function Processing (redis, gplus) {
  const self = this;
  // hide "new"
  if (!(this instanceof Processing)) return new Processing(opt);

  self.gplus = gplus


  // returnedUser is a G+ user
  self.getDetails = (returnedUser) => {

    gplus.activities.list({'userId': returnedUser, 'collection': 'public'}, function(err,activity){
      var gPlusPosts = activity.items.map(i=>{
        return {
          postId: i.id,
          replies: i.object.replies.totalItems,
          postDate: i.updated
        }
      })

      redis.lrange(returnedUser, 0, -1, function(err, postIds){
        var missingPosts;
        if(postIds === undefined) {
          missingPosts = gPlusPosts
        } else {
          missingPosts = gPlusPosts.filter(gpp=> !postIds.includes(gpp.postId))
        }

        missingPosts.forEach(gpp=>{
          redis.lpush(returnedUser, gpp.postId)
          redis.hmset(
            // commentid, # of replies, post update date?
            gpp.postId,
            "replies", gpp.replies,
            "postDate", gpp.postDate
          )
        })
      })
      // redis.hgetall(returnedUser, (err, storedPosts) =>{
      //   if(storedPosts === null || storedPosts) {
      //     redis.hmset(
      //       returnedUser,
      //       // commentid, # of replies, post update date?
      //       "postId", activity.items[0].id,
      //       "replies", activity.items[0].object.replies.totalItems,
      //       "postDate", activity.items[0].updated
      //     )
      //   }
      // })
    });
  }
}
