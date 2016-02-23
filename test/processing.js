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
  const returnedUser = "+ADetectionAlgorithmADA"; // the .id of what's stored in the users list
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

  // var gplus = {
  //   activities: {
  //     list: function(params, callback){}
  //   }
  // };

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

  describe('When an individual record was not found in the keystore', ()=> {

    beforeEach(function() {
      redis.hmset = sinon.spy()
      redis.lpush = sinon.spy()
      sinon.stub(redis, 'lrange', function(key, min, max, replies){
        replies(null, undefined)
      })
      sinon.stub(gplus.activities, 'list', function(params, callback) {
        callback(null, activityFeedSingle);
      })
    })

    afterEach(function() {
      gplus.activities.list.restore()
      redis.lrange.restore()
    });

    it('should insert a new redis hash with the results from the Slack comment list', function(){

      const processing = new Processing(redis, gplus);

      processing.getDetails(returnedUser);

      // Should do two items here
      sinon.assert.calledWith(redis.lpush,
        returnedUser, activityFeedSingle.items[0].id
      );
      sinon.assert.calledWith(redis.hmset,
        activityFeedSingle.items[0].id,
        'replies', activityFeedSingle.items[0].object.replies.totalItems,
        'postDate', activityFeedSingle.items[0].updated
      );
    });
  });
  describe('When a record was found in the keystore', function() {

    beforeEach(function() {
      redis.hmset = sinon.spy();
    });

    afterEach(function() {
    });

    describe('and there are no new replies', function(){
      // this means "we compared the redis k/v with the activity list, and there's no changes"
      // aka the gplus.list call is the same as the k/v store
      beforeEach(function() {
        sinon.stub(redis, 'hgetall', function(key, replies){
          replies(null, {
            replies: 69,
            postDate: '2015-12-11T19:45:31.331Z'
          })
        })

        sinon.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        });
      })
      afterEach(function(){
        redis.hgetall.restore();
        gplus.activities.list.restore();
      })

      it('will not update redis with any values', function(){
        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        sinon.assert.notCalled(redis.hmset);
      })
    })

    describe('and the reply count was updated on a post', function() {
      var singlePost = 'z12yhxrrcpnuivqeb22sxfwpomzmihzls'
      beforeEach(function() {
        sinon.stub(redis, 'hgetall', function(key, response){
          var data =
          {
            replies: 65,
            postDate: '2015-12-11T19:45:31.331Z'
          };
          response(null, data);
        }).calledWith(singlePost);

        sinon.stub(redis, 'lrange', function(key, min, max, response){
          response(null, activityFeedSingle.items[0].id)
        }).withArgs(returnedUser, 0, 1)

        sinon.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        });
      })

      afterEach(function(){
        redis.hgetall.restore()
        redis.lrange.restore()
        gplus.activities.list.restore()
      })

      it('will update the k/v hash with the updated post count', function(){
        const processing = new Processing(redis, gplus);
        processing.getDetails(returnedUser);

        sinon.assert.calledWith(redis.hmset, singlePost,
          "replies", activityFeedSingle.items[0].object.replies.totalItems,
          "postDate", activityFeedSingle.items[0].updated)
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
        beforeEach(function() {
          sinon.stub(redis, 'lrange', function(key, min, max, response){
            response(null, activityFeedMulti.items[0].id)
          }).withArgs(returnedUser, 0, 1)

          sinon.stub(redis, 'hgetall', function(key, response){
            var data =
            {
              //this is now the key:      postId: 'z12yhxrrcpnuivqeb22sxfwpomzmihzls',
              replies: 69,
              postDate: '2015-12-11T19:45:31.331Z'
            };
            response(null, data);
          });
          sinon.stub(gplus.activities, 'list', function(params, callback) {
            callback(null, activityFeedMulti);
          });
        });

        afterEach(function(){
          redis.hgetall.restore()
          gplus.activities.list.restore()
        })

        it.skip('should paste the post to the Slack group', function(){
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser);
          sinon.assert.calledWith(unirest.send, "")
        })
        
        it('should add the new post into the redis hash', function(){
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser);

          sinon.assert.calledWith(redis.hmset,
            activityFeedMulti.items[1].id,
            'replies', activityFeedMulti.items[1].object.replies.totalItems,
            'postDate', activityFeedMulti.items[1].updated
          )
        })
      })
    })
  });
