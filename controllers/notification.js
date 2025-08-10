const nodemailer = require("nodemailer")
const notificationmodel =require("../models/notification")
const transport=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.EMAIL_COUSTMER,
        pass:process.env.EMAIL_PASSWORD
    }
})
const sendmail= async(to, subject ,text,orderId,userId)=>{
    try{
        await transport.sendMail({
            from:process.env.EMAIL_COUSTMER,
            to,
            subject,
            text,
        })
        await notificationmodel.create({
            userId:userId,
            orderId:orderId,
            message:text,
            status:"confirmed"
        })
    }catch(err){
        console.error("faild to send email",err.message)
                throw err;  // مهم ترمي الخطأ عشان تعرف لو في مشكلة

    }
}
module.exports={sendmail}