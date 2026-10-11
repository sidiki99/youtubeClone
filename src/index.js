
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"])
import express from "express";



import cors from "cors";


const { default: connectDB } = await import("./db/index.js");
const { app } = await import("./app.js");
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

app.use(cors({
  origin:process.env.CORS_ORIGIN,
  credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb"}));
app.use(express.static("public"));

connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`Server is running at port:${process.env.PORT}`)
  })
})
.catch((err)=>{
  console.log("MongoDB Connection failed",err)
})


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