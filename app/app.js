var google = require('googleapis');
var fs = require('fs');
var plus = google.plus('v1');
const envVars = require('../env.conf.json');
const Rx = require('rx');
const redis = require('../libs/redis-access.js');
var moment = require('moment');

// Poll for new posts made by anyone in the list of "approved" people
//  plus#activityFeed supplies an "updated" parameter
//  if "updated" is unchanged (no new posts), iterate through the items, and check the replies count against what is stored in the db
//  if it's a new post, post it to Slack
//
//  if the reply count has changed for a given post, comments.list sort by descending all comments from now until last updated date filtered to ADA
//      post ADA's comment to Slack

var TEST_API_KEY = envVars.API_KEY;
var THROWAWAY_KEY = envVars.API_KEY2;

const countMap = new Map();
countMap.set(TEST_API_KEY, {successCount: 0, failCount: 0});
countMap.set(THROWAWAY_KEY, {successCount: 0, failCount: 0});
const fileDescriptor = fs.openSync("logs/output.txt", 'w');
const app = (apiKey, user) => {
  const userId = JSON.parse(user);
  var request = plus.activities.list({
    auth: apiKey,
    userId : userId.id,//'+ADetectionAlgorithmADA',
    collection : 'public'
  }, function(err, resp) {

    const counts = countMap.get(apiKey);

    if(err !== null){
      console.log("ERROR!");
      console.log(err);
      counts.failCount++;
      if(counts.failCount > 51){
        fs.close(fileDescriptor, () => {
          console.log("File closed");
          exit(0);
        });
      }
    } else {
      counts.successCount++;

      if(resp.items === null){
        console.log("Bailing out... " + resp);
        return;
      }
      // var numItems = resp.items.length;
      // for (var i = 0; i < numItems; i++) {
      //   var id = resp.items[i].id;
      //   console.log('ID: ' + id + 'Actor: ' + resp.items[i].actor.displayName + ' Content: ' +
      //   resp.items[i].object.content);
      //   var commentRequest = plus.comments.list({
      //     auth: TEST_API_KEY,
      //     activityId: id
      //   }, function(err, resp){
      //     if(err !== null){
      //       console.log("Failed to get comment list for " + id);
      //       // continue;
      //     }
      //     console.log(resp);
      //   });
      // }
    }
    const output = moment().format('h:mm:ss a') + " " + userId.username + " " + " Fail count: " + counts.failCount + " Success count: " + counts.successCount + " " + apiKey;

    console.log(output);

    if(err !== null && counts.failCount < 50){
      fs.write(fileDescriptor, output+"\n", ()=>{
        console.log("wrote to file\n");
      })
    }
  });
};

var source = Rx.Observable
.interval(500 /* ms */)
.timeInterval()
;
//.take(3);
const connection = redis.open();
var subscription = source.subscribe(
  next => {
    redis.retrieve(connection, "users", (value)=>{
      const apiKey = next.value % 2 == 0
      ? TEST_API_KEY
      : THROWAWAY_KEY;
      app(apiKey, value);
    });
  },
  err => {
    console.log('Error: ' + err);
    redis.close();
  },
  () => {
    console.log('Completed');
    redis.close();
  }
);
