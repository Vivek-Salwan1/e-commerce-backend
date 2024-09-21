const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
  userEmail: String,
  amountPaid:Number,
  orderID: String,
  paymentID: String, // Add paymentID to store Razorpay payment ID
  paymentStatus: String,
  fullname: String,
  phone: String,
  country: String,
  state: String,
  city: String,
  pincode: String,
  address: String,
  orderedItems: Array,
  orderDate:Date
});

const OrderModel = new mongoose.model('orderdetail', OrderSchema);

module.exports = OrderModel;
