module.exports = Processing

function Processing (redis, gplus) {
  const self = this;
  // hide "new"
  if (!(this instanceof Processing)) return new Processing(redis, gplus);

  self.gplus = gplus
  self.redis = redis

  // returnedUser is a G+ user
  self.getDetails = (returnedUser, apiKey) => {

    self.gplus.activities.list({auth: apiKey, userId: returnedUser, collection: 'public'}, function(err,activity){
      if(err !== null){
        console.log(err)
        return
      }
      var gPlusPosts = activity.items.map(i=>{
        return {
          postId: i.id,
          replies: i.object.replies.totalItems,
          postDate: i.updated
        }
      })

      self.redis.lrange(returnedUser, 0, -1, function(err, postIds){
        var missingPosts, existingPosts

        if(postIds === undefined || postIds) {
          missingPosts = gPlusPosts
          existingPosts = []
        } else {
          missingPosts = gPlusPosts.filter(gpp=> !postIds.includes(gpp.postId))
          existingPosts = gPlusPosts.filter(gpp=> postIds.includes(gpp.postId))
        }

        missingPosts.forEach(gpp=>{

          postComment(gpp)

          redis.lpush(returnedUser, gpp.postId)
          redis.hmset(
            // commentid, # of replies, post update date?
            gpp.postId,
            "replies", gpp.replies,
            "postDate", gpp.postDate
          )
        })

        existingPosts.forEach(gpp=>{
          redis.hgetall(gpp.postId, (err, storedPosts) =>{
            if(gpp.replies > storedPosts.replies) {
              redis.hmset(
                gpp.postId,
                "replies", activity.items[0].object.replies.totalItems,
                "postDate", activity.items[0].updated
              )
            }
          })
        })
      })

      function postComment(post){
        
      }
    });
  }
}
