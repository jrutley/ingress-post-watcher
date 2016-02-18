var chai = require("chai");
var sinon = require("sinon");
var Processing = require("../libs/processing.js");
var assert = require("assert");
var activityFeedMulti = require("./activityFeed-multi.json");
var activityFeedSingle = require("./activityFeed-single.json");
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
  const returnedUser = "+ADetectionAlgorithmADA";

  var redis = {
    hgetall: function(key, response){},
    hmset: function(key, args){}
  }

  var gplus = {
    activities: {
      list: function(params, callback){}
    }
  };

  it('should retrieve the activity list from G+', function(){
    try{
      sinon.spy(gplus.activities, 'list');

      const processing = new Processing(redis, gplus);
      processing.getDetails(returnedUser);
      assert(gplus.activities.list.calledWith({
        'userId' : returnedUser,
        'collection' : 'public'
      }));
    } finally {
      gplus.activities.list.restore()
    }
    });

    describe('When an individual record was not found in the keystore', ()=> {

      var before = function() {
        redis.hmset = sinon.spy();
        sinon.stub(redis, 'hgetall', function(key, replies){
          replies(null, null)
        });

        sinon.stub(gplus.activities, 'list', function(params, callback) {
          callback(null, activityFeedSingle);
        });
      };

      var after = function() {
        gplus.activities.list.restore();
        redis.hgetall.restore();
      };

      it('should insert a new redis hash with the results from the g+ comment list', function(){
        before()

        const processing = new Processing(redis, gplus);

        processing.getDetails(returnedUser);

        // Should do two items here
        sinon.assert.calledWith(redis.hmset,
          returnedUser,
          'postId', activityFeedSingle.items[0].id,
          'replies', activityFeedSingle.items[0].object.replies.totalItems,
          'postDate', activityFeedSingle.items[0].updated
        );

        after()
        // Expect that redis.set gets called with the user and a newly initialized key
        // const processing = new Processing(redis, gplus);
        // const expectedValue = {}
        //
        // var expected = {key: dataObj.users.id, value: {}};
        //
        // // i.e. redis.get returns (nil) when we query the datastore for that object
        // // in that case we need to call out to G+ to retrieve all posts, and then call redis.set with the result
        //
        // processing.getDetails(data).should.return(expected);
      });

      it.skip('should post to the G+ hangout that the bot is starting up', function(){

      })


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
        var before = function() {
          sinon.stub(redis, 'hgetall', function(key, replies){
            replies(null, {
              postId: 'z12yhxrrcpnuivqeb22sxfwpomzmihzls',
              replies: 69,
              postDate: '2015-12-11T19:45:31.331Z'
            })
          })

          sinon.stub(gplus.activities, 'list', function(params, callback) {
            callback(null, activityFeedSingle);
          });
        }
        var after = function(){
          redis.hgetall.restore();
          gplus.activities.list.restore();
        };

        it('will not update redis with any values', function(){
          before()
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser);

          sinon.assert.notCalled(redis.hmset);
          after()
        })
      })

      describe('and the reply count was updated on a post', function(){
        var before = function() {
          sinon.stub(redis, 'hgetall', function(key, response){
            var data =
            {
              postId: 'z12yhxrrcpnuivqeb22sxfwpomzmihzls',
              replies: 69,
              postDate: '2015-12-11T19:45:31.331Z'
            };
            response(null, data);
          });

          sinon.stub(gplus.activities, 'list', function(params, callback) {
            callback(null, activityFeedSingle);
          });
        }

        var after = function(){
          redis.hgetall.restore();
        }

        it.skip('will update the k/v hash with the updated value', function(){})

        describe.skip('and the poster is ADA', function(){
          it.skip('post to the G+ hangout with the reply')
        })
        describe.skip('and the poster is not ADA', function(){
          it.skip('will not post to the G+ hangout')
        })
      })

      // Use that to iterate through all the values to find any reply updates, or if there are any posts that are not new
      describe('and when there is a new post', function() {
        // We know this because it's not in the k/v list
        var before = function() {
          sinon.stub(redis, 'hgetall', function(key, response){
            var data =
            {
              postId: 'z12yhxrrcpnuivqeb22sxfwpomzmihzls',
              replies: 69,
              postDate: '2015-12-11T19:45:31.331Z'
            };
            response(null, data);
          });
          sinon.stub(gplus.activities, 'list', function(params, callback) {
            callback(null, activityFeedMulti);
          });
        }

        var after = function(){
          redis.hgetall.restore();
        }

        it.skip('should paste the post to the G+ group', function(){

        })
        it.skip('should add the new post into the redis hash', function(){
          before()
          const processing = new Processing(redis, gplus);
          processing.getDetails(returnedUser);

          sinon.assert.notCalled(redis.hmset)
          after()
        })
      })
    })
  });
