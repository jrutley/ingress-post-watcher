module.exports = Processing
function Processing (redis, gplus) {
  // hide "new"
  if (!(this instanceof Processing))
    return new Processing(opt);

  this.gplus = gplus;


  // returnedUser is a G+ user
  this.getDetails = (returnedUser) => {
    gplus.activities.list({'userId': returnedUser, 'collection': 'public'}, function(err,res){
      console.log(err +" " +res);
      redis.set(res);
    });
  };
}
