import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret:process.env.CLOUDINARY_SECRET_KEY // Click 'View API Keys' above to copy your API secret
    });
  })


  const uploadOnCloudinary = async (localFilePath)=>{
    try{
         if(!localFilePath) return null
          //upload file 
         const response = await cloudinary.uploader.upload(localFilePath,
             {
                 resource_type:"auto"
             }
          )

          // file has been uploaded successfully 
          console.log("file is uploaded on cloudinary ",
            response.url          
          )
          return response;
    }catch(error){
         fs.unlinkSync(localFilePath) // remove the locally save temporary file  as upload operation got failed
         return null
    }
  }

  export{uploadOnCloudinary}