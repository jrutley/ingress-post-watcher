const chai = require("chai");
const sinon = require("sinon");
const Processing = require("../libs/processing.js");
const assert = require("assert");
const activityFeedMulti = require("./activityFeed-multi.json");
const activityFeedSingle = require("./activityFeed-single.json");
const Redis = require("../libs/redis-access.js")
const redisLib = require("redis")
const google = require('googleapis')
const gplus = google.plus('v1')
const request = require('request')
const commentListSingle = require('./commentList-single.json')
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

describe('Given that we are processing the next user in the list', function(){
  // We have made a call to Redis, and it returned our user
  //const returnedUser = "+ADetectionAlgorithmADA"; // the .id of what's stored in the users list
  const returnedUser = "114076692022231059864" // ADA's ID
  var slackUrl = 'https://my.slack.url.com/services/sample/id'

  var connection = {
    hgetall: function(key, response){},
    lrange: function(key, min, max, response){},
    lpush: function(key, value, response){},
    hset: function(key, args){},
    hget: function(key, h, response){},
    auth: function(pass){}
  }
  sinon.stub(redisLib, "createClient").returns(connection);
  var redis = Redis('localhost', 12345, 'password')

  it('should retrieve the activity list from G+', sinon.test(function(){
    this.spy(gplus.activities, 'list');

    const apiKey = 'myApiKey'
    const processing = new Processing(redis, gplus);
    processing.getDetails(returnedUser, apiKey);
    assert(gplus.activities.list.calledWith({
      auth: apiKey,
      userId : returnedUser,
      collection : 'public'
    }));
  }))

  describe('When a user has no posts found in the data store', function() {
    it('should create a new record for that user, with the user\'s # as the key, the post # as the field, and description as the value', sinon.test(function(){
      this.spy(redis, 'hset')
      this.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
      this.stub(redis, 'hgetall', function(user, replies){
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
    }))
    it('should not post these new posts to Slack', sinon.test(function(){
      this.spy(redis, 'hset')
      this.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
      this.stub(redis, 'hgetall', function(user, replies){
        replies(null, null)
      })
      this.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')

      var slackUrl = 'https://my.slack.url.com/services/sample/id'
      const processing = new Processing(redis, gplus, slackUrl);
      processing.getDetails(returnedUser);

      sinon.assert.notCalled(request.post, slackUrl)
    }))
  })

  describe('When a post is already found in the keystore', function() {
    describe('and there are no new replies', function(){
      // this means "we compared the redis k/v with the activity list, and there's no changes"
      // aka the gplus.list call is the same as the k/v store
      it('will not update redis with any values', sinon.test(function(){
        // Arrange
        this.spy(redis, 'hset')
        this.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        this.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        const processing = new Processing(redis, gplus);
        // Act
        processing.getDetails(returnedUser);

        // Assert
        sinon.assert.calledWith(redis.hgetall, returnedUser)
        sinon.assert.notCalled(redis.hset);
      }))

      it('will not post to Slack', sinon.test(function(){
        this.spy(request, 'post')
        this.spy(redis, 'hset')
        this.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        this.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        const processing = new Processing(redis, gplus)
        processing.getDetails(returnedUser)

        sinon.assert.notCalled(request.post)
      }))
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
      it('will not update the k/v hash with the updated post count if we fail to retrieve the comments', sinon.test(function(){
        setup(this)
        const error = {
          code: 403,
          errors: [{ domain: 'usageLimits',
          reason: 'dailyLimitExceededUnreg',
          message: 'Daily Limit for Unauthenticated Use Exceeded. Continued use requires signup.',
          extendedHelp: 'https://code.google.com/apis/console'
        }]}
        this.stub(gplus.comments, 'list', function(params, callback){
          callback(error, null)
        })
        // I don't want to mess up my pretty Mocha output
        this.stub(console, 'log')

        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);


        var postHashValue = JSON.stringify({
          replies: activityFeedSingle.items[0].object.replies.totalItems,
          postDate: activityFeedSingle.items[0].updated
        })
        sinon.assert.neverCalledWith(redis.hset,
          returnedUser, activityFeedSingle.items[0].id, postHashValue
        )
      }))
      describe('and the poster is ADA', function(){
        it('post to Slack with the reply', sinon.test(function(){
          // Arrange
          setup(this)
          // Make another call to G+ to get the comment List
          this.stub(gplus.comments, 'list', function(params, callback){
            callback(null, commentListSingleADA)
          })
          this.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
          const adaReply = commentListSingleADA.items[0]

          // Act
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser, 'apiKey', slackUrl);

          // Assert
          sinon.assert.calledWith(request.post, slackUrl, {
            json: {text: `<!channel>: New comment from ${adaReply.actor.displayName} at ${adaReply.inReplyTo[0].url}. Message: ${adaReply.object.content}`}
          })
        }))

      })

      describe('and the poster is not ADA', function(){
        it('will not post to Slack', sinon.test(function(){
          // Arrange
          setup(this)
          // Make another call to G+ to get the comment List
          this.stub(gplus.comments, 'list', function(params, callback){
            callback(null, commentListSingle)
          })
          this.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
          const nonAdaReply = commentListSingle.items[0]

          // Act
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser, 'apiKey', slackUrl, ['+ADetectionAlgorithmADA', returnedUser]);

          // Assert
          sinon.assert.neverCalledWith(request.post, slackUrl, {
            json: {text: `<!channel>: New comment from ${nonAdaReply.actor.displayName} at ${nonAdaReply.inReplyTo[0].url}. Message: ${nonAdaReply.object.content}`}
          })
        }))
      })
    })

    // Use that to iterate through all the values to find any reply updates, or if there are any posts that are not new
    describe('and when there is a new post', function() {
      // We know this because it's not in the k/v list
      // AKA 2+ Google posts, and only one Redis post

      it('should paste the post to the Slack group', sinon.test(function(){
        this.spy(redis, 'hset')
        this.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedMulti);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}
        this.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        // ONLY RETURN A SINGLE POST HERE. We want to pretend that Redis only has one entry
        this.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')

        const processing = new Processing(redis, gplus);

        var item1 = activityFeedMulti.items[1]

        processing.getDetails(returnedUser, 'apiKey', slackUrl);

        sinon.assert.calledWith(request.post, slackUrl, {
          json: {text: `<!channel>: New post from ${item1.actor.displayName} titled "${item1.title}"\n${item1.url}`}
        })
      }))

      it('should add the new post into the redis hash', sinon.test(function(){
        //Arrange
        this.spy(redis, 'hset')
        this.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedMulti);
        })
        var postData = JSON.stringify({
          replies: 69,
          postDate: '2015-12-11T19:45:31.331Z'
        })
        var hgetallResult = {z12yhxrrcpnuivqeb22sxfwpomzmihzls: postData}

        // ONLY RETURN A SINGLE POST HERE. We want to pretend that Redis only has one entry
        this.stub(redis, 'hgetall', function(user, replies){
          replies(null, hgetallResult)
        }).calledWith(returnedUser)

        this.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
        this.stub(gplus.comments, 'list', function(params, callback){
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
      }))
    })
  })
})
