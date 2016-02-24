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
  var redis = new Redis()
  var connection = {
    hgetall: function(key, response){},
    lrange: function(key, min, max, response){},
    lpush: function(key, value, response){},
    hmset: function(key, args){},
    auth: function(pass){}
  }
  sinon.stub(redisLib, "createClient").returns(connection);
  redis.open("server", "port", "password")

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
      sandbox.spy(redis, 'hmset')
      sandbox.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
      sandbox.stub(redis, 'hgetall', function(user, replies){
        replies(null, null)
      })

      const processing = new Processing(redis, gplus);
      processing.getDetails(returnedUser);

      sinon.assert.calledWith(redis.hmset,
        returnedUser, activityFeedSingle.items[0].id, {
          postDate: activityFeedSingle.items[0].updated,
          replies: activityFeedSingle.items[0].object.replies.totalItems
        }
      )
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
        sandbox.spy(redis, 'hmset')
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
        sinon.assert.notCalled(redis.hmset);

        sandbox.restore()
      })
      it('will not post to Slack', function(){
        var sandbox = sinon.sandbox.create()
        sandbox.spy(request, 'post')
        sandbox.spy(redis, 'hmset')
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

    describe.skip('and the reply count was updated on a post', function() {
      var singlePost = 'z12yhxrrcpnuivqeb22sxfwpomzmihzls'

      it('will update the k/v hash with the updated post count', function(){
        var sandbox = sinon.sandbox.create()
        sandbox.spy(redis, 'hmset');
        sandbox.stub(request, 'post')
        sandbox.stub(redis, 'hgetall', function(key, response){
          var data =
          {
            replies: 65,
            postDate: '2015-12-11T19:45:31.331Z'
          };
          response(null, data);
        }).calledWith(singlePost);

        sandbox.stub(redis, 'lrange', function(key, min, max, response){
          response(null, [activityFeedSingle.items[0].id])
        })

        sandbox.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        });



        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        sandbox.assert.calledWith(redis.hmset, singlePost,
          "replies", activityFeedSingle.items[0].object.replies.totalItems,
          "postDate", activityFeedSingle.items[0].updated)

        sandbox.restore()
        })

        describe.skip('and the poster is ADA', function(){
          it.skip('post to Slack with the reply')
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
          sandbox.spy(redis, 'hmset')
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
          var slackUrl = 'https://my.slack.url.com/services/sample/id'

          var item1 = activityFeedMulti.items[1]

          processing.getDetails(returnedUser, 'apiKey', slackUrl);

          sinon.assert.calledWith(request.post, slackUrl, {
            json: {text: `@channel: New post from ${item1.actor.displayName} titled "${item1.title}"\n${item1.url}`}
          })
          sandbox.restore()
        })

        it('should add the new post into the redis hash', function(){
          var sandbox = sinon.sandbox.create()
          // ONLY RETURN A SINGLE POST HERE. We want to pretend that Redis only has one entry
          sandbox.stub(request, 'post').yields(null, {statusCode: 200}, 'ok')
          sandbox.stub(redis, 'lrange', function(key, min, max, response){
            response(null, [activityFeedSingle.items[0].id])
          })
          sandbox.stub(redis, 'hgetall', function(key, response){
            var data =
            {
              //this is now the key:      postId: 'z12yhxrrcpnuivqeb22sxfwpomzmihzls',
              replies: 69,
              postDate: '2015-12-11T19:45:31.331Z'
            };
            response(null, data);
          });
          sandbox.stub(gplus.activities, 'list', function(params, callback) {
            callback(null, activityFeedMulti);
          });

          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser);

          sandbox.assert.calledWith(redis.hmset,
            activityFeedMulti.items[1].id,
            'replies', activityFeedMulti.items[1].object.replies.totalItems,
            'postDate', activityFeedMulti.items[1].updated
          )

          sandbox.restore()
        })
      })
    })
  })
