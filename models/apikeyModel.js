var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var apikeyModel = new Schema({
  apikey:{type: String},
  channel_name:{type:String},
  type : {type:String},
  email:{type:String}
});


module.exports=mongoose.model('APIkey',apikeyModel);
