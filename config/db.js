const mongoose = require("mongoose")
require("dotenv").config()

const connectDB = async() =>{
try{
    await mongoose.connect(process.env.MONGODB_URI,{
        useNewUrlParser:true,
        useUnifiedTopology:true,
    });
    console.log("Connected to MongoDB succesfully")
}catch(err){
    console.error(`Error connecting to mongoDB ${err.message}`)
    process.exit(1)
}
}

module.exports = connectDB