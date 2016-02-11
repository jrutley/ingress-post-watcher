var assert = require("assert"); // node.js core module
var sinon = require("sinon");
var model = require("../libs/model.js");
var chai = require("chai");

chai.should();



describe('In order to check if a post has been updated', function(){
  describe('getting a user from the list', ()=> {
    // it('should retrieve the last element from the datastore', function() {
    //   m
    // });
    // describe('no post count', () => {
    //   it('will create a post count of 0', ()={
    //
    //   });
    // });
    it('should expect an array of JSON', () => {
      const data = {
        "users": [{
          "username": "Brian Rose",
          "id": "113686253941057080055"
        }]
      };

      const modelInst = new model({});

      const result = modelInst.process(data);
      result.users[0].should.have.property('replyCount');
    });
  });
  //
  // it('pops the last element', function(){
  //   assert.equal(-1, [1,2,3].indexOf(4)); // 4 is not present in this array so indexOf returns -1
  // })
});
// describe('should pop the last element', function(){
// describe('Users must not be dropped from the data store', function(){
//
// }
