var chai = require("chai");
var sinon = require("sinon");
var Processing = require("../libs/processing.js");
var assert = require("assert");
var activityFeedMulti = require("./activityFeed-multi.json");
var activityFeedSingle = require("./activityFeed-single.json");
var Redis = require("../libs/redis-access.js")
var redisLib = require("redis")
var google = require('googleapis')
var gplus = google.plus('v1')
var request = require('request')
var commentListSingle = require('./commentList-single.json')
const commentListSingleADA = require('./commentList-single-ADA.json')

chai.should();

// Poll for new posts made by anyone in the list of "approved" people
//  plus#activityFeed supplies an "updated" parameter
//  if "updated" is unchanged (no new posts), iterate through the items, and check the replies count against what is stored in the db
//  if it's a new post, post it to Slack
//
//  if the reply count has changed for a given post, comments.list sort by descending all comments from now until last updated date filtered to ADA
//      post ADA's comment to Slack

// Go to Redis and retrieve the next person to query
// Query Redis for that individual's record
// Pass that record into this function

describe('Given that we have received the next user from Redis', function(){
  // We have made a call to Redis, and it returned our user
  //const returnedUser = "+ADetectionAlgorithmADA"; // the .id of what's stored in the users list
  const returnedUser = "114076692022231059864" // ADA's ID
  var slackUrl = 'https://my.slack.url.com/services/sample/id'
  var redis = new Redis()
  var connection = {
    hgetall: function(key, response){},
    lrange: function(key, min, max, response){},
    lpush: function(key, value, response){},
    hset: function(key, args){},
    auth: function(pass){}
  }
  sinon.stub(redisLib, "createClient").returns(connection);

  it('should retrieve the activity list from Slack', function(){
    try{
      sinon.spy(gplus.activities, 'list');

      const apiKey = 'myApiKey'
      const processing = new Processing(redis, gplus);
      processing.getDetails(returnedUser, apiKey);
      assert(gplus.activities.list.calledWith({
        auth: apiKey,
        userId : returnedUser,
        collection : 'public'
      }));
    } finally {
      gplus.activities.list.restore()
    }
  })

  describe('When a user has no posts found in redis', function() {
    it('should create a new hash with the user as the key, the post ID as the field, and description as the value', function(){
      var sandbox = sinon.sandbox.create()
      sandbox.spy(redis, 'hset')
      sandbox.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
      sandbox.stub(redis, 'hgetall', function(user, replies){
        replies(null, null)
      })

      const processing = new Processing(redis, gplus);
      processing.getDetails(returnedUser);

      sinon.assert.calledWith(redis.hset,
        returnedUser, activityFeedSingle.items[0].id, JSON.stringify({
          replies: activityFeedSingle.items[0].object.replies.totalItems,
          postDate: activityFeedSingle.items[0].updated
        })
      )
      sandbox.restore()
    })
    it('should not post these new posts to Slack', function(){
      var sandbox = sinon.sandbox.create()
      sandbox.spy(redis, 'hset')
      sandbox.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
      sandbox.stub(redis, 'hgetall', function(user, replies){
        replies(null, null)
      })
      sandbox.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')

      var slackUrl = 'https://my.slack.url.com/services/sample/id'
      const processing = new Processing(redis, gplus, slackUrl);
      processing.getDetails(returnedUser);

      sinon.assert.notCalled(request.post, slackUrl)
      sandbox.restore()
    })
  })

  describe('When a post is already found in the keystore', function() {
    describe('and there are no new replies', function(){
      // this means "we compared the redis k/v with the activity list, and there's no changes"
      // aka the gplus.list call is the same as the k/v store
      it('will not update redis with any values', function(){
        // Arrange
        var sandbox = sinon.sandbox.create()
        sandbox.spy(redis, 'hset')
        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        sandbox.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        const processing = new Processing(redis, gplus);
        // Act
        processing.getDetails(returnedUser);

        // Assert
        sinon.assert.calledWith(redis.hgetall, returnedUser)
        sinon.assert.notCalled(redis.hset);

        sandbox.restore()
      })
      it('will not post to Slack', function(){
        var sandbox = sinon.sandbox.create()
        sandbox.spy(request, 'post')
        sandbox.spy(redis, 'hset')
        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        sandbox.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        const processing = new Processing(redis, gplus)
        processing.getDetails(returnedUser)

        sinon.assert.notCalled(request.post)
        sandbox.restore()
      })
    })

    describe('and the reply count was updated on a post', function() {
      var singlePost = 'z12yhxrrcpnuivqeb22sxfwpomzmihzls'
      var setup = (sandbox) => {
        sandbox.spy(redis, 'hset')
        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        })

        var storedPostData = JSON.stringify({
          replies: 68,
          postDate: activityFeedSingle.items[0].updated
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: storedPostData}

        sandbox.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)
        sandbox.stub(redis, 'hget', function(userId, postId, replies){
          replies(null, storedPostData)
        }).calledWith(returnedUser, activityFeedSingle.items[0].id)

      }

      it('will update the k/v hash with the updated post count', function(){
        var sandbox = sinon.sandbox.create()
        setup(sandbox)
        sandbox.stub(gplus.comments, 'list', function(params, callback){
          callback(null, commentListSingleADA)
        })

        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        var postHashValue = JSON.stringify({
          replies: activityFeedSingle.items[0].object.replies.totalItems,
          postDate: activityFeedSingle.items[0].updated
        })
        sinon.assert.calledWith(redis.hset,
          returnedUser, activityFeedSingle.items[0].id, postHashValue
        )

        sandbox.restore()
      })
      it('will not update the k/v hash with the updated post count if we fail to retrieve the comments', function(){
        var sandbox = sinon.sandbox.create()
        setup(sandbox)
        const error = {
          code: 403,
          errors: [
            { domain: 'usageLimits',
               reason: 'dailyLimitExceededUnreg',
               message: 'Daily Limit for Unauthenticated Use Exceeded. Continued use requires signup.',
               extendedHelp: 'https://code.google.com/apis/console'
            }
          ]
        }
        sandbox.stub(gplus.comments, 'list', function(params, callback){
          callback(error, null)
        })
        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        var postHashValue = JSON.stringify({
          replies: activityFeedSingle.items[0].object.replies.totalItems,
          postDate: activityFeedSingle.items[0].updated
        })
        sinon.assert.neverCalledWith(redis.hset,
          returnedUser, activityFeedSingle.items[0].id, postHashValue
        )

        sandbox.restore()
      })
      describe('and the poster is ADA', function(){
        it('post to Slack with the reply', function(){
          var sandbox = sinon.sandbox.create()

          // Arrange
          setup(sandbox)
          // Make another call to G+ to get the comment List
          sandbox.stub(gplus.comments, 'list', function(params, callback){
            callback(null, commentListSingleADA)
          })
          sandbox.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
          const adaReply = commentListSingleADA.items[0]

          // Act
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser, 'apiKey', slackUrl);

          // Assert
          sinon.assert.calledWith(request.post, slackUrl, {
            json: {text: `<@channel>: New comment from ${adaReply.actor.displayName} at ${adaReply.selfLink}`}
          })

          sandbox.restore()
        })

      })

      describe.skip('and the poster is not ADA', function(){
        it.skip('will not post to Slack')
      })
    })

    // Use that to iterate through all the values to find any reply updates, or if there are any posts that are not new
    describe('and when there is a new post', function() {
      // We know this because it's not in the k/v list
      // AKA 2+ Google posts, and only one Redis post

      it('should paste the post to the Slack group', function(){
        var sandbox = sinon.sandbox.create()
        sandbox.spy(redis, 'hset')
        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedMulti);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        sandbox.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        // ONLY RETURN A SINGLE POST HERE. We want to pretend that Redis only has one entry
        sandbox.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')

        const processing = new Processing(redis, gplus);

        var item1 = activityFeedMulti.items[1]

        processing.getDetails(returnedUser, 'apiKey', slackUrl);

        sinon.assert.calledWith(request.post, slackUrl, {
          json: {text: `<@channel>: New post from ${item1.actor.displayName} titled "${item1.title}"\n${item1.url}`}
        })
        sandbox.restore()
      })

      it('should add the new post into the redis hash', function(){
        var sandbox = sinon.sandbox.create()

        //Arrange
        sandbox.spy(redis, 'hset')
        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedMulti);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}

        // ONLY RETURN A SINGLE POST HERE. We want to pretend that Redis only has one entry
        sandbox.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        sandbox.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
        sandbox.stub(gplus.comments, 'list', function(params, callback){
          callback(null, commentListSingleADA)
        })

        // Act
        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        // Assert
        sinon.assert.calledWith(redis.hset,
          returnedUser, activityFeedMulti.items[1].id, JSON.stringify({
            replies: activityFeedMulti.items[1].object.replies.totalItems,
            postDate: activityFeedMulti.items[1].updated
          })
        )

        sandbox.restore()
      })


    })
  })
})
