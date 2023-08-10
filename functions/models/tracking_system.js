const mongoose=require("mongoose");
const tracking_system=new mongoose.Schema({
    
    time:{
        type:String,
        required:true
    },
    co_ordinate:{
       type:Array
    },
    device_id:{
        type:String,
        required:true
    },
    avg_speed:{
        type:String,
        required:true
    }
});
const trackingSystem=mongoose.model("tracking_system",tracking_system);
module.exports=trackingSystem;