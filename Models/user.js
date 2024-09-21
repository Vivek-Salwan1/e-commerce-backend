const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({

    name:String,
    email:String,
    phone:String,
    password:String,
    date:String
});

const UserModel = new mongoose.model('user', UserSchema)
module.exports = UserModel;
