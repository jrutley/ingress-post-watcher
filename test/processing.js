var chai = require("chai");
var sinon = require("sinon");
var Processing = require("../libs/processing.js");
var assert = require("assert");

chai.should();


// items: [
var sample = {
  "kind": "plus#activity",
  "etag": "\"4OZ_Kt6ujOh1jaML_U6RM6APqoE/3GC4S3wIYUJAHbO1WBNVMtN-O9s\"",
  "title": "T-15",
  "published": "2015-12-11T19:45:31.331Z",
  "updated": "2015-12-11T19:45:31.331Z",
  "id": "z12yhxrrcpnuivqeb22sxfwpomzmihzls",
  "url": "https://plus.google.com/+ADetectionAlgorithmADA/posts/CzbmSw8F7N3",
  "actor": {
    "id": "114076692022231059864",
    "displayName": "A Detection Algorithm (ADA)",
    "url": "https://plus.google.com/114076692022231059864",
    "image": {
      "url": "https://lh6.googleusercontent.com/-keYZsrxeARU/AAAAAAAAAAI/AAAAAAAAAFM/fy4YA6j4UCo/photo.jpg?sz=50"
    },
    "verification": {
      "adHocVerified": "UNKNOWN_VERIFICATION_STATUS"
    }
  },
  "verb": "post",
  "object": {
    "objectType": "note",
    "actor": {
      "verification": {
        "adHocVerified": "UNKNOWN_VERIFICATION_STATUS"
      }
    },
    "content": "T-15\ufeff",
    "url": "https://plus.google.com/+ADetectionAlgorithmADA/posts/CzbmSw8F7N3",
    "replies": {
      "totalItems": 69,
      "selfLink": "https://content.googleapis.com/plus/v1/activities/z12yhxrrcpnuivqeb22sxfwpomzmihzls/comments"
    },
    "plusoners": {
      "totalItems": 155,
      "selfLink": "https://content.googleapis.com/plus/v1/activities/z12yhxrrcpnuivqeb22sxfwpomzmihzls/people/plusoners"
    },
    "resharers": {
      "totalItems": 30,
      "selfLink": "https://content.googleapis.com/plus/v1/activities/z12yhxrrcpnuivqeb22sxfwpomzmihzls/people/resharers"
    },
    "attachments": [
      {
        "objectType": "photo",
        "displayName": "T-15",
        "id": "114076692022231059864.6227114657713004402",
        "content": "nnfavjpd2^4.png",
        "url": "https://plus.google.com/photos/114076692022231059864/albums/6227114654970949169/6227114657713004402",
        "image": {
          "url": "https://lh3.googleusercontent.com/-aZoX9AeuWjM/Vmsnydycn3I/AAAAAAAAAPM/rjKh94ClfzA/w506-h750/nnfavjpd2%255E4.png",
          "type": "image/jpeg"
        },
        "fullImage": {
          "url": "https://lh3.googleusercontent.com/-aZoX9AeuWjM/Vmsnydycn3I/AAAAAAAAAPM/rjKh94ClfzA/w928-h572/nnfavjpd2%255E4.png",
          "type": "image/jpeg",
          "height": 572,
          "width": 928
        }
      }
    ]
  },
  "provider": {
    "title": "Google+"
  },
  "access": {
    "kind": "plus#acl",
    "description": "Public",
    "items": [
      {
        "type": "public"
      }
    ]
  }
};

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

  describe('When an individual record was not found', ()=> {
    // Use sinon to have a call to "redis" return "not found"/"null" for a given key
    var redis = sinon.spy();
    redis.set = sinon.spy();
    var gplus = {
      activities: {
        list: function(params, callback){}
      }
    };

    it('should retrieve the comment list from G+', function(){
      sinon.spy(gplus.activities, 'list');

      const processing = new Processing(redis, gplus);
      processing.getDetails(returnedUser);
      assert(gplus.activities.list.calledWith({
        'userId' : returnedUser,
        'collection' : 'public'
      }));
    });

    it('should generate a new one with the results from the g+ comment list', function(){
      sinon.stub(gplus.activities, 'list', function(params, callback) {
        console.log("Stub called here. params is <<" + params +">> and callback is <<"+callback+">>");
        callback(null, sample);
      });
      const processing = new Processing(redis, gplus);

      processing.getDetails(returnedUser);

      assert(redis.set.calledWith(sample));
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

    // beforeEach(function() {
    // });
    afterEach(function() {
      gplus.activities.list.restore();
    });

  });
});
