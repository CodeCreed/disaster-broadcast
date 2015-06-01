var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var alertModel = new Schema({
  apikey:{type: String},
  name:{type:String},
  description:{type:String},
  lat:{type:Number},
  long:{type:Number},
  radius:{type:Number},
  severity :{type:Number},
  timestamp:{type : Number}
});

module.exports=mongoose.model('Alert',alertModel);
