var chai = require("chai");
var Processing = require("../libs/processing.js");

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

describe('Given that we have received data', function(){
  // We have made a call to Redis, and it returned our user
  const data = {
    "users": [{
      "username": "Brian Rose",
      "id": "113686253941057080055"
    }];

  describe('When an individual record was not found', ()=> {
    // Use sinon to have a call to "redis" return "not found"/"null" for a given key
    var redisReturn = null;

    it('should generate a new one', function(){
      // Expect that redis.set gets called with the user and a newly initialized key
      var processing = new Processing();
      var expected = {/* Put the newly generated value here */};
      processing.get(data).should.return(expected);
    });
  });
});
