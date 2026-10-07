import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"])

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./db/index.js";

console.log("MONGO URI:", process.env.MONGODB_URI);

connectDB();


// import mongoose ,{ connect } from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from "express"
// const app = express();

// ;(async ()=>{
//   try{
//     await (await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`))
    
//   app.on("error",(error)=>{
//     console.log("Error",error)
//     throw error
//   })

//   app.listen(process.env.PORT,()=>{
//     console.log(`App is listening on PORT:${process.env.PORT}`)
//   })
//   }
//   catch(error){
//     console.error("Error in Connecting with MongoDB",error);
//     throw err
//   }
// })()