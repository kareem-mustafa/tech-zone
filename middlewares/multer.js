const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({ //diskStorage is used to store files on the disktop on the file that i will create
    destination: (req, file, cb) => { //destinition =>فين نخزن الصورة
        cb(null, path.join(__dirname, '../images'))
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)//filename => اسم الصورةاي
    }
});

const upload = multer({ storage: storage });


module.exports = upload;
