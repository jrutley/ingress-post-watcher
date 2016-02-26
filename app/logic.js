var google = require('googleapis');
var fs = require('fs');
var plus = google.plus('v1');
const envVars = require('../env.conf.json');
var moment = require('moment');
var Processing = require('../libs/processing.js')
var Redis = require('../libs/redis-access.js')

// Poll for new posts made by anyone in the list of "approved" people
//  plus#activityFeed supplies an "updated" parameter
//  if "updated" is unchanged (no new posts), iterate through the items, and check the replies count against what is stored in the db
//  if it's a new post, post it to Slack
//
//  if the reply count has changed for a given post, comments.list sort by descending all comments from now until last updated date filtered to ADA
//      post ADA's comment to Slack

const countMap = new Map();
if(envVars.API_KEYS === undefined){
  console.log("You must set the API_KEYS variable to an array of keys in env.conf.json")
  process.exit(1)
}
envVars.API_KEYS.forEach(key=>{
  countMap.set(key, {successCount: 0, failCount: 0});
});
const fileDescriptor = fs.openSync("logs/output.txt", 'w');

function App(apiKey, user, redis) {
  const userId = JSON.parse(user);
  console.log("\"Parsing\" user... " + user);
  var processing = Processing(redis, plus)
  processing.getDetails(userId.id, apiKey, envVars.slackUrl, envVars.replyUsers)
}

module.exports = App;
