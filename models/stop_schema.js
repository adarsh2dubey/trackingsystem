const mongoose=require("mongoose");
const stopSchema=new mongoose.Schema({
    initialTime:{
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
    dest_co_ordinate:{
        type:Array
     }
});
const stop_tables=mongoose.model("stop_tables",stopSchema);
module.exports=stop_tables;