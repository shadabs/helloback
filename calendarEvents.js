'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var address_schema = new Schema({
    name: String,
    clinic_name: String,
    address_line_one: String,
    address_line_two: String,
    address_line_three: String,
    phone_number: String,
    email: String,
    landmark: String,
    city: String,
    state: String,
    pin_code: String,
    latitude: String,
    longitude: String
});

var other_details_schema = new Schema({
    age: Number,
    gender: String,
    patient_type: String
});

var event_data_schema = new Schema({
    editable: { type: Boolean, default: true },
    overlap: { type: Boolean, default: true }
})

var appointment_details_schema = new Schema({
    walk_in: Boolean,
    appointment_time: { type: Date, default: Date.now },
    status: String,
    color: String,
    in_time: Date,
    rmo: { type: Schema.Types.ObjectId, ref: 'users' },
    rmo_in_time: Date,
    consultant: { type: Schema.Types.ObjectId, ref: 'users' },
    consultant_in_time: Date,
    report_url: String,
    company_name: String,
    division: String,
    appointment_for: String
})

var profile_picture_schema = new Schema({
    url: String,
    status: {
        type: String,
        default: "Y"
    }
})


var reminder_schema = new Schema({
    description: String,
    all_day: { type: Boolean, default: false },
    repeat: {
        is_repeat: { type: Boolean, default: false },
        repeat_for: String
    }
});

var event_details_schema = new Schema({
    association: String,
    credit_points: {
        is_applicable: { type: Boolean, default: false },
        points: Number
    },
    speakers: [String],
    request_for_sponsorship: String,
    event_type: String,
    fees: Number,
    spot_fees: Number,
    ticket_url: String,
    event_attachment: {
        url: String,
        status: {
            type: String,
            default: "Y"
        }
    },
    ppt_attachment: {
        url: String,
        status: {
            type: String,
            default: "Y"
        }
    },
    type_of_event: String,
    interested_users: [{ type: Schema.Types.ObjectId, ref: 'users' }]
})


var ambulance_details_schema = new Schema({
    "ambulanceVehicleTyp": String,
    "name": String,
    "mobile": String,
    "userId": String,
    "username": String,
    "usermobile": String,
    "useremail": String,
    "pickUpDate": Date,
    "for": String,
    "isReturn": String,
    "isOvernight": String,
    "isWaiting": String,
    "pickUpTime": Date,
    "pickupLat": Number,
    "pickupLang": Number,
    "pickupAddress": String,
    "destAddress": String,
    "destLat": Number,
    "destLang": Number,
    "waitingLat": Number,
    "waitingLang": Number,
    "waitingAddress": String,
    "waitingTime": String
})

var calendarEvents_schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    patient_id: { type: Schema.Types.ObjectId, ref: 'users' },
    doctor_id: { type: Schema.Types.ObjectId, ref: 'users' },
    ambulance_id: { type: Schema.Types.ObjectId, ref: 'users' },
    calendar_name: { type: String, default: "Docsmart" },
    invitees: [String], // list of email, phone numbers
    description: String,
    reason: String,
    create_date: { type: Date, default: Date.now },
    start_time: { type: Date, },
    active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    // end_time: { type: Date, required: true },
    clinic_id: Schema.Types.ObjectId,
    venue_address: address_schema,
    patient_address: address_schema,
    active: { type: Boolean, default: true },
    color: String,
    other_details: other_details_schema,
    event_data: event_data_schema,
    appointment_details: appointment_details_schema,
    profile_picture: profile_picture_schema,
    purpose_type: String,
    title: String,
    event_details: event_details_schema,
    reminder_details: reminder_schema,
    cancel_reason: String,
    ambulance_appointment_details: ambulance_details_schema
});


module.exports = mongoose.model('calenderEvents', calendarEvents_schema);