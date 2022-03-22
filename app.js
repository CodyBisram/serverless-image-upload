require('dotenv').config();

const serverless = require('serverless-http');
const cors = require("cors");
const express = require('express'); //"^4.13.4"
const aws = require('aws-sdk'); //"^2.2.41"
const bodyParser = require('body-parser');
const multer = require('multer'); // "^1.3.0"
const multerS3 = require('multer-s3'); //"^2.7.0"

aws.config.update({
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    accessKeyId: process.env.ACCESS_KEY_ID,
    region: process.env.AWS_REGION'
});

const app = express();
const s3 = new aws.S3({
  signatureVersion: 'v4'
});

app.use(bodyParser.json());
app.use(cors());

const upload = multer({
    storage: multerS3({
        s3: s3,
        acl: 'public-read-write',
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
            cb(null, String(Date.now() + '.' + file.originalname.split('.').pop())); //use Date.now() for unique file keys
        }
    }),
    fileFilter: function (req, file, cb) {
        if (!file.mimetype.startsWith('image')) {
            return cb(new Error('Only images are allowed.'));
        }
        cb(null, true);
    }
});

//open http://localhost:3000/ in browser to see upload form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

var uploadImage = upload.array('upl', 1);
//used by upload form
app.post('/upload', (req, res, next) => {
    uploadImage(req, res, (err) => {
        if (err == "Error: Only images are allowed.") return res.status(400).send({ success: false, message: "Only images are allowed." });
        if(!req.files) return res.status(400).send({ success: false, message: "File is required." });
        res.send({ success: true, imageUrl: req.files[0].location })
    })
});

app.delete('/', (req, res) => {
    if(Object.keys(req.body).length === 0) return res.status(400).send({ 
        success: false, message: "Select images to delete from bucket."
    })
    const objects = [];
    for(var k in req.body){
        var params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: req.body[k]
        }
        try {
            await s3.headObject(params).promise()
            console.log(req.body[k] + " found in S3 bucket.")
        } catch (err) {
            return res.status(400).send({ 
                success: false, message: reg.body[k] + " not found in S3 bucket."
            })
    }
        objects.push({Key: req.body[k]})
    }
    const options = {
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: {
            Objects: objects,
            Quiet: false
        }
    }
    // console.log(options)
    s3.deleteObjects(options, function(err, data) {
        if (err) console.log(err, err.stack);
        else console.log(data);
    })
    res.send(req.body);
});

if(process.env.NODE_ENV != "production" && process.env.NODE_ENV != "dev"){
    app.listen(3000, () => {
        console.log('Listening on port 3000...');
    });
} else {
    module.exports.handler = serverless(app);
}
