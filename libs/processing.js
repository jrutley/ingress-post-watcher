var request = require('request')
module.exports = Processing

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
        return true;
      }
      k++;
    }
    return false;
  };
}

function Processing (redis, gplus) {
  const self = this;
  // hide "new"
  if (!(this instanceof Processing)) return new Processing(redis, gplus);

  self.gplus = gplus
  self.redis = redis

  // returnedUser is a G+ user
  self.getDetails = (returnedUser, apiKey, slackUrl) => {

    self.gplus.activities.list({auth: apiKey, userId: returnedUser, collection: 'public'}, function(err,activity){
      if(err !== null){
        console.log(err)
        return
      }
      var gPlusPosts = activity.items.map(i=>{
        return {
          postId: i.id,
          replies: i.object.replies.totalItems,
          postDate: i.updated,
          postTitle: i.title,
          poster: i.actor.displayName,
          url: i.url
        }
      })

      self.redis.hgetall(returnedUser, function(err, allRedisPosts){
        // postIds now flips between key and value for all post keys known to redis
        // now we iterate through all of the G+ posts those keys
        var missingPosts, existingPosts

        if(allRedisPosts === null) {
          missingPosts = gPlusPosts
          existingPosts = []
        } else {
          // postIds is a redis hash of <<userId (postId / "{replyCount: ###, timestamp: 2016-...T...Z}")
          var postIds = Object.keys(allRedisPosts)

          missingPosts = gPlusPosts.filter(gpp=> !postIds.includes(gpp.postId))
          existingPosts = gPlusPosts.filter(gpp=> postIds.includes(gpp.postId))
        }

        missingPosts.forEach(gpp=>{
          postComment(gpp, slackUrl)

          redis.lpush(returnedUser, gpp.postId)
          redis.hmset(
            // commentid, # of replies, post update date?
            returnedUser,
            gpp.postId,
            {replies: gpp.replies,
            postDate: gpp.postDate}
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

      function postComment(post, slackUrl){
        request.post(slackUrl, {
          json: {text: `@channel: New post from ${post.poster} titled "${post.postTitle}"\n${post.url}`}
        }, function(error, response, body){})
      }
    });
  }
}
