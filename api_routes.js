const bodyParser = require("body-parser");
const log4js = require('log4js');
const passport = require('passport')
const moment = require("moment");
const config = require("../../config/index.js");
const notificationService = require("../notification/api_routes.js");
var path = require('path');

var PushNotificationsController = require(path.resolve('app/user/push_notifications/push-notification.controller'));
var firebaseDBController = require(path.resolve('app/firebase/index'));

const async = require("async");

const auth = require('../authentication/init.js')();
var calendarEvents_collection = require('../../models/calendarEvents');
var users_collection = require('../../models/users');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const accessRightsMiddleware = require('../authentication/accessRightsMiddleware.js');
var SMS = require('../sms').init;
var Email = require('../email').init;
const auditLog = require('../auditlog');
var OBJECTID = require('mongoose').Types.ObjectId;

var SOCKET;

function initCalendar(app, socket) {

    app.use(bodyParser.json());
    SOCKET = socket;
    // user id is extracted from authentication middleware
    app.post("/api/calendar/listCalendars", auth.authenticate(), listCalendars);

    // req.body should contain
    // calendarName: String,
    // invitees: Array[String],
    // description: String,
    // reason: String,
    // startTime: Date,
    // endTime: Date,
    // venue.name,
    // venue.addrFirstLine: String,
    // venue.addrSecondLine: String,
    // venue.addrThirdLine: String,
    // venue.city: String,
    // venue.state: String,
    // venue.landmark: String,
    // venue.contactNumber: String,
    // venue.pincode: String,
    app.post("/api/calendar/addEvent", auth.authenticate(), addEvent);

    // req.body should contain everything for the addEvent plus
    // eventId: String
    app.post("/api/calendar/editEvent", auth.authenticate(), editEvent);

    // eventId: String
    app.post("/api/calendar/cancelEvent", auth.authenticate(), cancelEvent);

    // user id is extracted from authentication middleware
    // calendarName : String [Optional]
    app.post("/api/calendar/listEvents", auth.authenticate(), listEvents);

    // req.body should contain
    // calendarName: String,
    // description: String,
    // reason: String,
    // startTime: Date,
    // endTime: Date,
    // patient.name,
    // patient.addrFirstLine: String,
    // patient.addrSecondLine: String,
    // patient.addrThirdLine: String,
    // patient.city: String,
    // patient.state: String,
    // patient.landmark: String,
    // patient.contactNumber: String,
    // patient.pincode: String,
    app.post("/api/calendar/addAppointment", auth.authenticate(), accessRightsMiddleware, addAppointment);
    // req.body should contain everything for the addAppointment plus
    // appointmentId: String
    app.post("/api/calendar/editAppointment", auth.authenticate(), editAppointment);

    // appointmentId: String
    app.post("/api/calendar/cancelAppointment", auth.authenticate(), accessRightsMiddleware, cancelAppointment);

    // user id is extracted from authentication middleware
    // calendarName : String [Optional]
    app.post("/api/calendar/listAppointments", auth.authenticate(), listAppointments);


    app.post("/api/calendar/listEventsByDoctorId", auth.authenticate(), listEventsByDoctorId);
    app.post("/api/calendar/newlistEvents", auth.authenticate(), newlistEvents);

    app.post("/api/calendar/listEventsByClinicId", auth.authenticate(), listAppointmentsByClinic);

    app.post("/api/calendar/blockTime", auth.authenticate(), blockTime);
    app.post("/api/calendar/unblockTime", auth.authenticate(), unblockTime);

    app.post("/api/calendar/rescheduleAndBlockAppointments", auth.authenticate(), rescheduleAndBlockAppointments);

    app.get("/api/calendar/listUserAppointments", auth.authenticate(), listAllAppointments);

    app.post("/api/calendar/listPatientAppointments", auth.authenticate(), listPatientAppointments);

    app.post("/api/calendar/update-appointment-details", auth.authenticate(), accessRightsMiddleware, updateAppointmentDetails)

    app.post("/api/calendar/reupdate-time-appointment", auth.authenticate(), accessRightsMiddleware, deleteAppointmentDetails)

    app.post("/api/calendar/add-follow-up", auth.authenticate(), accessRightsMiddleware, addFollowUp);
    app.post("/api/calendar/saveserviceandnotify", auth.authenticate(), saveserviceandnotify);

    app.post("/api/calendar/list-type-of-events", auth.authenticate(), listTypeOfEvents);

    app.post("/api/calendar/search-type-of-events", auth.authenticate(), searchTypeOfEvents);

    app.post("/api/calendar/add-general-events", auth.authenticate(), addGeneralEvent);

    app.post("/api/calendar/change-interest", auth.authenticate(), changeInterest);

    app.post("/api/calendar/list-events-details", auth.authenticate(), listEventDetails);

    app.get("/api/calendar/list-my-events", auth.authenticate(), listMyEvents);

    app.post("/api/calendar/list-open-events", listOpenEvents);

    app.post("/api/calendar/rescheduleAppointments", auth.authenticate(), rescheduleAppointments);

    app.post("/api/calendar/cancelDoctorAppointment", auth.authenticate(), cancelDoctorAppointment);

    app.post('/api/calendar/addReminder', auth.authenticate(), addReminder);

    app.get('/api/calendar/listAllReminders', auth.authenticate(), listAllReminders);

    app.post('/api/calendar/listDoctorsTimeSlots', auth.authenticate(), listDoctorsTimeSlots);

    app.post('/api/calendar/panelDoctorsTimeSlots', auth.authenticate(), panelDoctorsTimeSlots);


    /**
     * Params:{
     *  currentApptId: String //The current Appointment Id
     * }
     */
    app.get('/api/calendar/get-next-prev-appointments', auth.authenticate(), listNextAndPrevAppointmnts)

    app.post('/api/calendar/addAmbulanceAppointment', auth.authenticate(), addAmbulanceAppointment);

    app.post('/api/calendar/saveAlertDetails', auth.authenticate(), saveAlertDetails);

    app.get('/api/calendar/getAllAlertDetails', auth.authenticate(), getAllAlertDetails);

    app.post('/api/calendar/deleteAlertDetails', auth.authenticate(), deleteAlertDetails);

    app.post('/api/calendar/changeAlertStatus', auth.authenticate(), changeAlertStatus);

    app.post('/api/calendar/get-last-appointment-visited-detail', auth.authenticate(), getLastAppointmentVisitedDetail);

}

function changeAlertStatus(req, res) {

    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    var data = req.body;
    var status = data.status;
    if (data._id) {
        calendarEvents_collection.findOneAndUpdate({
                _id: data._id
            }, {
                $set: {
                    'active': status
                }

            },
            function(err, response) {
                if (err) {
                    console.log('User data not updated ' + err);
                    res.json({
                        status: 'failed',
                        reason: err,
                        token: req.user.token
                    });
                } else {
                    return res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: response
                    })
                }
            });
    } else {
        return res.json({
            status: 'failed',
            reason: 'Error occured',
            token: req.user.token
        });
    }
};

function deleteAlertDetails(req, res) {

    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    var data = req.body;
    if (data._id) {
        calendarEvents_collection.findOneAndUpdate({
                _id: data._id
            }, {
                $set: {
                    'is_deleted': true
                }

            },
            function(err, response) {
                if (err) {
                    console.log('User data not updated ' + err);
                    res.json({
                        status: 'failed',
                        reason: err,
                        token: req.user.token
                    });
                } else {
                    return res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: response
                    })
                }
            });
    } else {
        return res.json({
            status: 'failed',
            reason: 'Error occured',
            token: req.user.token
        });
    }
};


function getAllAlertDetails(req, res) {

    if (!req.user) {
        res.json({
            status: 'failed',
            reason: 'No such user',
        });
        return;
    }

    if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
        return;
    }

    calendarEvents_collection.find({
            user_id: ObjectId(req.user.id),
            "calendar_name": "Alert"
        })
        .exec(function(err, response) {
            if (err) {
                res.json({
                    token: req.user.token,
                    status: 'failed',
                    reason: err
                });
            } else {
                return res.json({
                    token: req.user.token,
                    status: 'ok',
                    data: response
                })
            }
        })

};




function saveAlertDetails(req, res) {

    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    var alertDetails = req.body;
    var startDate = alertDetails.startDate;
    if (req.user.id) {

        var repeat = {
            is_repeat: alertDetails.is_repeat,
            repeat_for: alertDetails.repeat
        }
        var reminder_details = {
            description: alertDetails.description,
            all_day: alertDetails.allDay,
            repeat: repeat
        }
        var calendarEvents = new calendarEvents_collection({
            user_id: req.user.id,
            calendar_name: req.body.calendarName || "Alert",
            start_time: startDate,
            reminder_details: reminder_details
        });

        calendarEvents.save(function(err, resp) {
            if (err) {
                console.log('Event not saved ' + err);
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        });
    } else {
        return res.json({
            status: 'failed',
            reason: 'Error occured',
            token: req.user.token
        });
    }
};


function listCalendars(req, res) {

    var id = req.body.doctor_id || req.user.id;

    if (!req.user.reason && req.user.id) {
        calendarEvents_collection.aggregate({
                $match: {
                    user_id: id,
                    active: true
                }
            })
            .group({
                _id: "$calendar_name",
                count: {
                    $sum: 1
                }
            })
            .exec(function(err, docs) {
                if (err) {
                    res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    console.log(docs);
                    res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            });

    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function addEvent(req, res) {
    var venue;
    if (req.body.venue) {
        venue = {
            name: req.body.venue.name,
            address_line_one: req.body.venue.addrFirstLine,
            address_line_two: req.body.venue.addrSecondLine,
            address_line_three: req.body.venue.addrThirdLine,
            phone_number: req.body.venue.contactNumber,
            landmark: req.body.venue.landmark,
            city: req.body.venue.city,
            state: req.body.venue.state,
            pin_code: req.body.venue.pincode
        };
    }
    if (!req.user.reason && req.user.id) {
        var form_data = new calendarEvents_collection({
            user_id: req.user.id,
            calendar_name: req.body.calendarName || "Events",
            invitees: req.body.invitees,
            description: req.body.description,
            reason: req.body.reason,
            start_time: req.body.startTime,
            end_time: req.body.endTime,
            venue_address: venue
        });
        form_data.save(function(err) {
            if (err) {
                console.log('Event not saved ' + err);
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                console.log('Event saved successfully!');
                res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        });
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/event found"
        });
    }
}

function editEvent(req, res) {
    var venue;
    if (req.body.venue) {
        venue = {
            name: req.body.venue.name,
            address_line_one: req.body.venue.addrFirstLine,
            address_line_two: req.body.venue.addrSecondLine,
            address_line_three: req.body.venue.addrThirdLine,
            phone_number: req.body.venue.contactNumber,
            landmark: req.body.venue.landmark,
            city: req.body.venue.city,
            state: req.body.venue.state,
            pin_code: req.body.venue.pincode
        };
    }
    if (!req.user.reason && req.user.id && req.body.eventId) {
        calendarEvents_collection.findByIdAndUpdate(req.body.eventId, {
                user_id: req.user.id,
                calendar_name: req.body.calendarName || "Events",
                invitees: req.body.invitees,
                description: req.body.description,
                reason: req.body.reason,
                start_time: req.body.startTime,
                end_time: req.body.endTime,
                venue_address: venue
            },
            function(err) {
                if (err) {
                    console.log('Event Changes not saved ' + err);
                    res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Event Changes saved successfully!');
                    res.json({
                        token: req.user.token,
                        status: "ok"
                    });
                }
            })
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/event found"
        });
    }
}

function listEvents(req, res) {

    var id = req.body.doctor_id || req.user.id;
    var desired = req.body.nameSearchKey || '';
    var nameSearchKey = desired.replace(/[^\w\s]/gi, '')

    var findObj = {
        doctor_id: id,
        active: true,
        calendar_name: {
            $in: req.body.calendar_list
        } || "Events",
        'patient_address.name': new RegExp(nameSearchKey, 'i')
    }

    if (req.body.startTime || req.body.endTime) {
        findObj.start_time = {};
    }

    if (req.body.startTime) {
        findObj.start_time.$gte = moment(req.body.startTime).toDate();
    }

    if (req.body.endTime) {
        findObj.start_time.$lt = moment(req.body.endTime).toDate();
    }

    if (!req.user.reason && req.user.id) {
        calendarEvents_collection.find(findObj)
            .sort('-create_date')
            .exec(function(err, docs) {
                if (err) {
                    res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            })

    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function cancelEvent(req, res) {
    if (!req.user.reason && req.user.id && req.body.eventId) {
        calendarEvents_collection.findByIdAndUpdate(req.body.eventId, {
                active: false
            },
            function(err) {
                if (err) {
                    console.log('Appointment Changes not saved ' + err);
                    res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Appointment Changes saved successfully!');
                    res.json({
                        token: req.user.token,
                        status: "ok"
                    });
                }
            })
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/appointment found"
        });
    }
}

// function rescheduleAppointments(req, res) {
//     console.log("rescheduleAppointments api called")
//     if (!req.user.id) {
//         return res.json({
//             status: 'failed',
//             reason: 'Unauthorized User',
//             token: req.user.token
//         })
//     }

//     if (req.user.reason) {
//         return res.json({
//             status: 'failed',
//             reason: req.user.reason,
//             token: req.user.token
//         })
//     }

//     var finalData = req.body;
//     console.log("finalData  " + JSON.stringify(finalData))
//     var appointmentDate = new Date(req.body.newAppointmentDate.appointmentDate)
//     console.log("appointmentDate " + appointmentDate)
//     var currentDate = new Date();
//     console.log("currentDate " + currentDate)

//     var finalData = [];

//     req.body.appointmentsToBeSaved.forEach(function (appointments) {
//         var startTime = new Date(appointments.start_time)
//         var endTime = new Date(appointments.end_time)

//         startTime.setFullYear(appointmentDate.getFullYear())
//         startTime.setMonth(appointmentDate.getMonth())
//         startTime.setDate(appointmentDate.getDate());

//         endTime.setFullYear(appointmentDate.getFullYear())
//         endTime.setMonth(appointmentDate.getMonth())
//         endTime.setDate(appointmentDate.getDate());

//         var appointmentData = {
//             appointmentId: appointments.appointmentId,
//             start_time: startTime,
//             end_time: endTime
//         }

//         finalData.push(appointmentData)
//     })

//     var tasks = []

//     var numberOfData = finalData.length;
//     var count = 0;

//     finalData.forEach(function (appt) {
//         calendarEvents_collection.findOne({
//             _id: ObjectId(appt.appointmentId)
//         }).exec(function (err, resp) {
//             if (err) {
//                 // console.log("err = " + err)
//                 count = count + 1;

//                 // console.log(numberOfData + " - error - " + count)
//                 if (count == numberOfData) {
//                     return res.json({
//                         status: 'ok',
//                         token: req.user.token
//                     })
//                 }

//             } else {
//                 var updatedAppointment = calendarEvents_collection(resp)

//                 updatedAppointment.start_time = appt.start_time
//                 updatedAppointment.end_time = appt.end_time

//                 updatedAppointment.save(function (err, data) {
//                     if (err) {
//                         return res.json({
//                             status: 'ok',
//                             reason: err,
//                             token: req.user.token
//                         })
//                     } else {
//                         count = count + 1;
//                         auditLog.registerAuditLog(req, req.user.id, null, resp, updatedAppointment, 'Appointment Reschedule');
//                         if (count == numberOfData) {
//                             return res.json({
//                                 status: 'ok',
//                                 token: req.user.token
//                             })
//                         }
//                     }
//                 })
//             }

//         })
//     })
// }

function generateOPDNumber(patient, doctorId, callback) {
    console.log("generateOPDNumber function api called")

    var visits = patient.visits;
    var OPDNumber = "";
    var opdCount = 0;
    for (var i = 0; i < visits.length; i++) {
        if (visits[i].doctor && visits[i].doctor.doctor_id + "" === doctorId) {
            opdCount++;
        }
    }
    opdCount += 1;

    users_collection.findOne({
        _id: ObjectId(doctorId)
    }).exec(function(err, doctor) {
        if (err || !doctor.UUID) {
            callback("Invalid Doctor ID or Doctor UUID not found.");
        } else {
            OPDNumber = "OPD_" + doctor.UUID + "_" + opdCount;
            // console.log('OPD Number generated  ' + OPDNumber);

            callback(null, OPDNumber);
        }
    });


}

function addAppointment(req, res) {
    console.log("addAppointment api called")
    console.log("req.body " + JSON.stringify(req.body))
    var patientDetails, otherDetails;
    console.log("req.body " + JSON.stringify(req.body))
    var appointmentObj = req.body.appointment;
    // console.log("appointmentObj " + JSON.stringify(appointmentObj))

    if (appointmentObj.patient) {
        if (appointmentObj.patient.purposeType) {
            var purpose_type = appointmentObj.patient.purposeType;
        }
    }

    // var sister_id = appointmentObj.appointmentDetails.sister;
    // console.log("purpose_type" + purpose_type)
    // console.log("sisters_id" + sister_id)

    var startTime = new Date(appointmentObj.startTime);
    var endTime = new Date(startTime.getTime() + 30 * 60000);

    if (appointmentObj.startTime === appointmentObj.endTime) {
        appointmentObj.endTime = endTime;
    }
    if (appointmentObj.patient) {
        patientDetails = {
            name: appointmentObj.patient.name,
            email: appointmentObj.patient.email,
            clinic_name: appointmentObj.patient.clinic_name,
            color: appointmentObj.patient.color,
            address_line_one: appointmentObj.patient.addrFirstLine,
            address_line_two: appointmentObj.patient.addrSecondLine,
            address_line_three: appointmentObj.patient.addrThirdLine,
            phone_number: appointmentObj.patient.contactNumber,
            landmark: appointmentObj.patient.landmark,
            city: appointmentObj.patient.city,
            state: appointmentObj.patient.state,
            pin_code: appointmentObj.patient.pincode
        };

        otherDetails = {
            age: appointmentObj.patient.age,
            gender: appointmentObj.patient.gender,
            patient_type: appointmentObj.patient.patientType
        }
    }

    var appointmentDetails = {
        appointment_for: 'Patient'
    }
    if (appointmentObj.appointmentDetails) {
        appointmentDetails.appointment_time = appointmentObj.appointmentDetails.appointmentDate;
        appointmentDetails.consultant = appointmentObj.appointmentDetails.consultant
        appointmentDetails.report_url = appointmentObj.appointmentDetails.reportUrl

        appointmentDetails.company_name = appointmentObj.appointmentDetails.companyName
        appointmentDetails.division = appointmentObj.appointmentDetails.division

        // console.log("appointmentFor = " + appointmentObj.appointmentDetails.appointmentFor)

        appointmentDetails.appointment_for = appointmentObj.appointmentDetails.appointmentFor || 'Patient'

    }

    var purposeType = appointmentObj.patient && appointmentObj.patient.purposeType ? appointmentObj.patient.purposeType : "";

    try {
        if (req.user.id) {
            // if (!req.user.reason && req.user.id) {
            var form_data = new calendarEvents_collection({
                user_id: req.user.id,
                calendar_name: appointmentObj.calendarName || "Appointments",
                description: appointmentObj.description,
                reason: appointmentObj.reason,
                color: appointmentObj.color,
                patient_id: appointmentObj.patient_id,
                doctor_id: appointmentObj.doctor_id,
                start_time: appointmentObj.startTime,
                end_time: appointmentObj.endTime,
                patient_address: patientDetails,
                other_details: otherDetails,
                clinic_id: appointmentObj.hospital_id,
                appointment_details: appointmentDetails,
                purpose_type: purposeType
            });



            form_data.save(function(err, data) {
                if (err) {
                    console.log('res 1 Appointment not saved ' + err);
                    res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Appointment saved successfully!');

                    if (form_data.calendar_name == "Appointments" && appointmentDetails.appointment_for == 'Patient') {
                        users_collection.findOne({
                                _id: ObjectId(form_data.patient_id)
                            })
                            .exec(function(err, user) {
                                if (err) {
                                    console.log("res 2 can't find patient details")
                                    res.json({
                                        token: req.user.token,
                                        status: "failed",
                                        reason: 'User not found'
                                    });
                                } else {
                                    //var updatedUser = users_collection(user)

                                    var date = new Date();


                                    generateOPDNumber(user, appointmentObj.doctor_id, function(err, OPDNumber) {
                                        if (err) {
                                            console.log('Unable to generate OPD ' + err);
                                        } else {

                                            var opdNumber = OPDNumber;
                                            var visit = {
                                                OPDNumber: opdNumber,
                                                appointmentId: ObjectId(data._id),
                                                doctor: {
                                                    doctor_id: appointmentObj.doctor_id
                                                }
                                            }

                                            visit.prescription = [{}];
                                            visit.advice = {
                                                services: [],
                                                statTests: [],
                                                procedures: [],
                                                referTo: [],
                                                pathologyTests: [],
                                                radiologyTests: []
                                            };

                                            visit.bp = {};
                                            visit.serviceCharges = 0;
                                            visit.statTestCharges = 0;
                                            visit.procedureCharges = 0
                                            visit.expectedTestCharges = 0;
                                            visit.charges = 0;
                                            visit.pathologyTestCharges = 0;
                                            visit.radiologyTestCharges = 0;

                                            visit.advice.dietPlan = {};
                                            visit.advice.eventDiagnosis = {};
                                            visit.findings = {};
                                            visit.findings.orthopedic = {};
                                            visit.findings.orthopedic.bones = {};
                                            visit.findings.orthopedic.bones.fracture = {};
                                            visit.findings.orthopedic.bones.fracture.upperExtremity = [];
                                            visit.findings.orthopedic.bones.mass = {};
                                            visit.findings.orthopedic.bones.mass.skull = [];
                                            visit.findings.orthopedic.bones.mass.chest = []
                                            visit.findings.orthopedic.upperExtremity = {};
                                            visit.findings.orthopedic.bones.mass.upperExtremity = [];
                                            visit.findings.orthopedic.bones.mass.lowerExtremity = [];
                                            visit.complaint = {
                                                text: ''
                                            };

                                            // console.log(JSON.stringify(visit))
                                            // console.log("visits = " + JSON.stringify(visit))

                                            user.visits.push(visit)

                                            user.save(function(err, resp) {
                                                if (err) {
                                                    console.log("OPD number could not be saved " + err)
                                                } else {
                                                    console.log("visits = " + JSON.stringify(resp.visits.length))
                                                    console.log("OPD number saved!")
                                                }
                                            });
                                        }
                                    });

                                }
                            })
                    }

                    var doctor = appointmentObj.doctor_id;
                    var patient = appointmentObj.patient_id;
                    if (appointmentObj.appointmentDetails) {
                        if (appointmentObj.appointmentDetails.sister) {
                            var sister = appointmentObj.appointmentDetails.sister;
                        }
                    }

                    // console.log(patient + " -=- " + doctor)
                    var currentTime = moment();
                    var me = req.user.id;
                    var my_name = ""

                    users_collection.find({
                            '_id': ObjectId(me)
                        })
                        .exec(function(err, resp) {
                            if (err) {
                                console.log(err)
                            } else {

                                my_name = resp[0].first_name + " " + resp[0].last_name;
                                var clinicname = "";
                                if (appointmentObj.patient == undefined) {
                                    for (var i = 0; i < resp[0].clinic_details.length; i++) {
                                        if (resp[0].clinic_details[i].id == appointmentObj.hospital_id) {
                                            clinicname = resp[0].clinic_details[i].general.name;
                                        }
                                    }
                                } else {
                                    clinicname = appointmentObj.patient.clinic_name;
                                }
                                //var notificaitonMetadata = {};

                                var infoText = "An appointment has been created for you at, reason: " + appointmentObj.reason + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A');
                                var appointmentNotificationObj = {
                                    info: infoText,
                                    type: "1",
                                    timestamp: currentTime,
                                    sender: me,
                                    for: [patient],
                                    isPushNotification: "true",
                                    metadata: null
                                }
                                notificationService.serverNotification(appointmentNotificationObj);


                                var infoTextForDoctor = "An appointment has been created on behalf of you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A');
                                var appointmentNotificationObjForDoc = {
                                    info: infoTextForDoctor,
                                    type: "1",
                                    timestamp: currentTime,
                                    sender: me,
                                    for: [doctor],
                                    isPushNotification: "true",
                                    metadata: null
                                }
                                notificationService.serverNotification(appointmentNotificationObjForDoc);


                                //Sisters API 
                                if (purpose_type == "Services") {
                                    console.log("inside Sister notification")
                                    var infoTextForSister = "An appointment has been created on behalf of you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A');
                                    var appointmentNotificationObjForSister = {
                                        // sender: me,
                                        // for: [sister],
                                        title: "New patient booking",
                                        message: infoTextForSister
                                            // doctor_id: doctorId + "",
                                            // doctor_name: doctorName + ""
                                    }
                                    PushNotificationsController.sendNotificationToken(sister, appointmentNotificationObjForSister);
                                }


                                //Send SMS Start
                                var patientSMSDetails = {
                                    id: patient,
                                    message: "An appointment has been created for you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A'),
                                    subject: "Appointment added."
                                }

                                var docSMSDetails = {
                                    id: doctor,
                                    message: "An appointment has been created on behalf of you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A'),
                                    subject: "Appointment added."
                                }

                                var users = []
                                users.push(patientSMSDetails)
                                users.push(docSMSDetails)
                                SMS.sendSMSToDocsmartUser(users, function(err, resp) {
                                    if (err) {
                                        console.log("sendSMSToDocsmartUser ERROR", err)
                                    } else {
                                        console.log("Message sent")
                                    }
                                })

                                //Send SMS End


                                //Send Email Start
                                var patientEmailDetails = {
                                    id: patient,
                                    message: "An appointment has been created for you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A'),
                                    subject: "Appointment added."
                                }
                                var docEmailDetails = {
                                    id: doctor,
                                    message: "An appointment has been created for you, in clinic: " + clinicname + " on: " + moment(appointmentObj.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentObj.startTime).format('h:mm A'),
                                    subject: "Appointment added."
                                }
                                var emailUsers = []
                                emailUsers.push(patientEmailDetails)
                                emailUsers.push(docEmailDetails)

                                Email.sendEmailToDocsmartUser(emailUsers, function(error, resp) {
                                    if (error) {
                                        console.log("sendEmailToDocsmartUser error = " + error)
                                    } else {
                                        console.log("Mail sent")
                                    }
                                });

                                //Send Email End

                            }
                        });
                    console.log("res 3 ok ")
                    return res.json({
                        token: req.user.token,
                        status: "ok",
                        data: data
                    });

                }
            });
        } else {
            console.log("res 4 No such user/appointment found")
            res.json({
                status: "failed",
                reason: "No such user/appointment found"
            });
        }
    } catch (error) {
        console.log("add appointment error ", error.message)
    }
    console.log("api end")
}

function editAppointment(req, res) {
    var patientDetails, otherDetails;

    if (!req.user.reason && req.user.id && req.body.appointmentId) {
        calendarEvents_collection.findByIdAndUpdate(req.body.appointmentId, {
                start_time: req.body.startTime,
                end_time: req.body.endTime
            },
            function(err) {
                if (err) {
                    console.log('Appointment Changes not saved ' + err);
                    res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Appointment changes saved successfully!');
                    res.json({
                        token: req.user.token,
                        status: "ok"
                    });

                    var doctor = req.body.doctor_id;
                    var patient = req.body.patient_id;


                    var currentTime = moment();
                    var me = req.user.id;
                    var my_name = ""

                    users_collection.find({
                            '_id': ObjectId(me)
                        })
                        .exec(function(err, resp) {
                            if (err) {
                                console.log(err)
                            } else {

                                my_name = resp[0].first_name + " " + resp[0].last_name;


                                var infoText = "Editted for you by " + my_name + " reason: " + req.body.reason + " on: " + moment(req.body.startTime).format('DD/MM/YYYY') + " at " + moment(req.body.startTime).format('h:mm A');
                                var appointmentNotificationObj = {
                                    info: infoText,
                                    type: "2",
                                    timestamp: currentTime,
                                    sender: me,
                                    for: [doctor, patient],
                                    isPushNotification: "true"
                                }

                                notificationService.serverNotification(appointmentNotificationObj);

                                //Send SMS Start
                                var patientSMSDetails = {
                                    id: patient,
                                    message: "Your appointment has been Rescheduled to " + moment(req.body.startTime).format('DD/MM/YYYY') + " " + moment(req.body.startTime).format('h:mm A') + " by " + my_name + ".",
                                    subject: "Appointment Rescheduled."
                                }

                                var users = []
                                users.push(patientSMSDetails)
                                SMS.sendSMSToDocsmartUser(users, function(err, resp) {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        console.log("Message sent")
                                    }
                                })

                                //Send SMS End

                                //Send Email Start
                                var patientEmailDetails = {
                                    id: patient,
                                    message: "Your appointment has been Rescheduled to " + moment(req.body.startTime).format('DD/MM/YYYY') + " " + moment(req.body.startTime).format('h:mm A') + " by " + my_name + ".",
                                    subject: "Appointment Rescheduled."
                                }
                                var emailUsers = []
                                emailUsers.push(patientEmailDetails)

                                Email.sendEmailToDocsmartUser(emailUsers, function(error, resp) {
                                    if (error) {
                                        console.log("error = " + error)
                                    } else {
                                        console.log("Mail sent")
                                    }
                                });

                                //Send Email End
                            }
                        })


                }
            })
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/appointment found"
        });
    }
}

function cancelAppointment(req, res) {

    if (!req.user.reason && req.user.id && req.body.appointmentId) {
        calendarEvents_collection.findByIdAndUpdate(req.body.appointmentId, {
                active: false,
                cancel_reason: req.body.reason
            },
            function(err) {
                if (err) {
                    console.log('Appointment Changes not saved ' + err);
                    return res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Appointment Changes saved successfully!');

                    users_collection.findOne({
                            'visits.appointmentId': ObjectId(req.body.appointmentId)
                        })
                        .exec(function(err, resp) {
                            if (err) {
                                return res.json({
                                    token: req.user.token,
                                    status: "failed",
                                    reason: err
                                });
                            } else {

                                var index = resp.visits.findIndex(function(o) {
                                    return o.appointmentId.toString() == req.body.appointmentId.toString()
                                })

                                resp.visits[index].status = 'done'

                                resp.save(function(err, response) {
                                    if (err) {
                                        return res.json({
                                            token: req.user.token,
                                            status: "failed",
                                            reason: err
                                        });
                                    } else {

                                        calendarEvents_collection.findOne({
                                                _id: ObjectId(req.body.appointmentId)
                                            })
                                            .populate('patient_id', '_id email mobile first_name last_name')
                                            .populate('doctor_id', '_id email mobile first_name last_name')
                                            .exec(function(err, resp) {
                                                if (err) {
                                                    console.log("err = " + err)
                                                    return res.json({
                                                        token: req.user.token,
                                                        status: "ok"
                                                    });
                                                } else {
                                                    var infoText = "Your appointment with Dr. " + resp.doctor_id.first_name + " " + resp.doctor_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled";
                                                    var appointmentNotificationObj = {
                                                        info: infoText,
                                                        type: "3",
                                                        timestamp: moment(),
                                                        sender: req.user.id,
                                                        for: [resp.patient_id._id],
                                                        isPushNotification: "true",
                                                        metadata: null
                                                    }
                                                    notificationService.serverNotification(appointmentNotificationObj);


                                                    var infoTextForDoctor = "Your appointment with " + resp.patient_id.first_name + " " + resp.patient_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled";
                                                    var appointmentNotificationObjForDoc = {
                                                        info: infoTextForDoctor,
                                                        type: "3",
                                                        timestamp: moment(),
                                                        sender: req.user.id,
                                                        for: [resp.doctor_id._id],
                                                        isPushNotification: "true",
                                                        metadata: null
                                                    }
                                                    notificationService.serverNotification(appointmentNotificationObjForDoc);

                                                    //Send SMS Start
                                                    var patientSMSDetails = {
                                                        id: resp.patient_id._id,
                                                        message: "Your appointment with Dr. " + resp.doctor_id.first_name + " " + resp.doctor_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled",
                                                        subject: "Appointment Canceled."
                                                    }

                                                    var docSMSDetails = {
                                                        id: resp.doctor_id._id,
                                                        message: "Your appointment with " + resp.patient_id.first_name + " " + resp.patient_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled",
                                                        subject: "Appointment Canceled."
                                                    }

                                                    var users = []
                                                    users.push(patientSMSDetails)
                                                    users.push(docSMSDetails)
                                                    SMS.sendSMSToDocsmartUser(users, function(err, resp) {
                                                        if (err) {
                                                            console.log(err)
                                                        } else {
                                                            console.log("Message sent")
                                                        }
                                                    })

                                                    //Send SMS End

                                                    //Send Email Start
                                                    var patientEmailDetails = {
                                                        id: resp.patient_id._id,
                                                        message: "Your appointment with Dr. " + resp.doctor_id.first_name + " " + resp.doctor_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled",
                                                        subject: "Appointment Canceled."
                                                    }
                                                    var docEmailDetails = {
                                                        id: resp.doctor_id._id,
                                                        message: "Your appointment with " + resp.patient_id.first_name + " " + resp.patient_id.last_name + " on " + moment(resp.start_time).format('DD/MM/YYYY') + " at " + moment(resp.start_time).format('h:mm A') + " has been canceled",
                                                        subject: "Appointment Canceled."
                                                    }
                                                    var emailUsers = []
                                                    emailUsers.push(patientEmailDetails)
                                                    emailUsers.push(docEmailDetails)

                                                    Email.sendEmailToDocsmartUser(emailUsers, function(error, resp) {
                                                        if (error) {
                                                            console.log("error = " + error)
                                                        } else {
                                                            console.log("Mail sent")
                                                        }
                                                    });

                                                    //Send Email End


                                                    return res.json({
                                                        token: req.user.token,
                                                        status: "ok"
                                                    });
                                                }
                                            })
                                    }
                                })
                            }
                        })
                }
            })
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/appointment found"
        });
    }
}

function listAppointments(req, res) {
    if (!req.user.reason && req.user.id) {
        calendarEvents_collection.find({
                user_id: req.user.id,
                active: true,
                calendar_name: {
                    $in: req.body.calendar_list
                } || ["Appointments"]
            })
            .sort('-create_date')
            .exec(function(err, docs) {
                if (err) {
                    res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            })

    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function listEventsByDoctorId(req, res) {



    if (!req.user.reason && req.user.id && req.body.doctor_id != null) {
        calendarEvents_collection.find({
                doctor_id: ObjectId(req.body.doctor_id),
                active: true
            })
            .sort('-create_date')
            .exec(function(err, docs) {
                if (err) {
                    res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            })

    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function newlistEvents(req, res) {
    if (!req.user.reason && req.user.id && (req.body.doctor_id != null || req.body.patient_id != null)) {
        var fromdate = req.body.fromdate;
        var todate = req.body.todate;
        var query = {
            active: true,
            create_date: {
                $gte: new Date(fromdate),
                $lte: new Date(todate)
            },
            calendar_name: { $in: req.body.calendartypes }
        };
        if (req.body.doctor_id != undefined) {
            query.doctor_id = ObjectId(req.body.doctor_id);
        } else if (req.body.patient_id != undefined && req.body.patient_id != "") {
            query.patient_id = ObjectId(req.body.patient_id);
        }
        // if (req.body.clinic_id != undefined && req.body.clinic_id.length != 0) {
        var clinicids = [];
        for (var i in req.body.clinic_id) {
            clinicids.push(ObjectId(req.body.clinic_id[i]));
        }
        query.clinic_id = clinicids;
        // }
        console.log(query);
        calendarEvents_collection.find(query)
            .sort('-create_date')
            .lean(true)
            .exec(function(err, docs) {
                if (err) {
                    res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    if (req.body.calendartypes.indexOf('Diagnostic Appointments') < 0) {
                        res.json({
                            token: req.user.token,
                            status: 'ok',
                            data: docs
                        });
                    } else {
                        if (req.body.doctor_id == undefined) {
                            var from = new Date(fromdate);
                            var to = new Date(todate);
                            db = require('../mysql_service')('diagnostic');
                            db.select(['booking_table.booking_date']);
                            db.join('booking_patient_details', 'booking_table.id = booking_patient_details.booking_id', 'RIGHT');
                            db.where('booking_patient_details.user_id', req.body.patient_id);
                            db.where('booking_table.booking_date between "' + from.getFullYear() + '-' + (from.getMonth() + 1) + '-' + from.getDate() + ' 00:00:00" AND "' + to.getFullYear() + '-' + (to.getMonth() + 1) + '-' + to.getDate() + ' 23:59:59"');
                            db.get('booking_table', function(err, rows) {
                                console.log(rows);
                                for (var i = 0; i < rows.length; i++) {
                                    docs.push({ calendar_name: 'Diagnostic Appointments', create_date: rows[i].booking_date, color: '#6e78dd' });
                                }
                                res.json({
                                    token: req.user.token,
                                    status: 'ok',
                                    data: docs
                                });
                            });
                            delete db;
                        }
                    }
                }
            })

    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function listAppointmentsByClinic(req, res) {

    if (!req.user) {
        res.json({
            status: 'failed',
            reason: 'No such user',
        });
        return;
    }

    if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
        return;
    }

    var clinicId = req.body.clinics;

    if (!clinicId) {
        res.json({
            status: 'failed',
            reason: 'Clinic Id not specified',
            token: req.user.token
        });
        return;
    }

    var today = moment().startOf('day')
    var tomorrow = moment(today).add(1, 'days')

    calendarEvents_collection.find({
            clinic_id: {
                $in: clinicId
            },
            active: true,
            calendar_name: "Appointments",
            start_time: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            }
        })
        .populate('patient_id', '_id first_name last_name')
        .populate('doctor_id', '_id first_name last_name')
        .sort('start_time')
        .exec(function(err, resp) {
            if (err) {
                res.json({
                    status: 'failed',
                    reason: 'Clinic not found',
                    token: req.user.token
                });
                return;
            } else {
                res.json({
                    status: 'ok',
                    token: req.user.token,
                    data: resp
                });
            }
        });

}

function blockTime(req, res) {

    if (req.user.id) {
        // console.log('doctor id', req.body.doctor_id)
        var form_data = new calendarEvents_collection({
            user_id: req.user.id,
            calendar_name: "blocked",
            color: "yellow",
            doctor_id: req.body.doctor_id,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            event_data: {
                editable: false,
                overlap: false
            }
        });
        form_data.save(function(err) {
            if (err) {
                console.log('Not saved ' + err);
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                console.log('Block time saved successfully!');
                res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such userfound"
        });
    }
}

function unblockTime(req, res) {
    calendarEvents_collection.findByIdAndUpdate(req.body.event_id, {
            active: false
        },
        function(err) {
            if (err) {
                console.log('Changes not saved ' + err);
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                console.log('Unblock time changes saved successfully!');
                res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        })
}

function rescheduleAndBlockAppointments(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    var apptArr = req.body.apptsToReschedule;

    apptArr.forEach(function(appt) {
        calendarEvents_collection.findByIdAndUpdate(appt.id, {

            start_time: appt.start,
            end_time: appt.end

        }, function(err) {
            if (err) {
                console.log('Changes not saved ' + err);
            } else {
                console.log('Appointment changes saved successfully!');

                var form_data = new calendarEvents_collection({
                    user_id: req.user.id,
                    calendar_name: "blocked",
                    color: "yellow",
                    doctor_id: req.body.doctor_id,
                    start_time: req.body.start_time,
                    end_time: req.body.end_time,
                    event_data: {
                        editable: false,
                        overlap: false
                    }
                });

                form_data.save(function(err) {
                    if (err) {
                        console.log('Not saved ' + err);
                    } else {
                        calendarEvents_collection.findOne({
                                _id: ObjectId(appt.id)
                            })
                            .populate('patient_id', '_id first_name last_name email mobile')
                            .exec(function(err, resp) {
                                if (!err) {
                                    // console.log("resp = " + JSON.stringify(resp))
                                    users_collection.findOne({
                                            _id: ObjectId(req.user.id)
                                        })
                                        .select('_id first_name last_name mobile email')
                                        .exec(function(err, userData) {
                                            if (!err) {
                                                var my_name = userData.first_name + " " + userData.last_name;
                                                //Send SMS Start
                                                var patientSMSDetails = {
                                                    id: resp.patient_id._id,
                                                    message: "Your appointment has been Rescheduled to " + moment(appt.start).format('DD/MM/YYYY') + " " + moment(appt.start).format('h:mm A') + " by " + my_name + ".",
                                                    subject: "Appointment Rescheduling."
                                                }

                                                var users = []
                                                users.push(patientSMSDetails)
                                                SMS.sendSMSToDocsmartUser(users, function(err, resp) {
                                                    if (err) {
                                                        console.log(err)
                                                    } else {
                                                        console.log("Message sent")
                                                    }
                                                })

                                                //Send SMS End

                                                //Send Email Start
                                                var patientEmailDetails = {
                                                    id: resp.patient_id._id,
                                                    message: "Your appointment has been Rescheduled to " + moment(appt.start).format('DD/MM/YYYY') + " " + moment(appt.start).format('h:mm A') + " by " + my_name + ".",
                                                    subject: "Appointment Rescheduling."
                                                }
                                                var emailUsers = []
                                                emailUsers.push(patientEmailDetails)

                                                Email.sendEmailToDocsmartUser(emailUsers, function(error, resp) {
                                                    if (error) {
                                                        console.log("error = " + error)
                                                    } else {
                                                        console.log("Mail sent")
                                                    }
                                                });

                                                //Send Email End
                                            }
                                        })
                                }
                            })
                    }
                });
            }
        });

    });



    res.json({
        token: req.user.token,
        status: "ok"
    });


}

function listPatientAppointments(req, res) {

    var id = req.user.id;

    // console.log(id);

    if (!req.user.reason && req.user.id) {
        calendarEvents_collection.find({
                patient_id: ObjectId(req.user.id),
                clinic_id: { $exists: true }
            })
            .populate('patient_id', '_id first_name last_name')
            .populate('doctor_id', '_id first_name last_name qualifications highest_qulification ratings specialities number_of_years_practicing')
            .populate('user_id', '_id first_name last_name')
            .sort('-start_time')
            .lean()
            .exec(function(err, data) {
                // console.log('data is ' + JSON.stringify(data));
                if (err) {
                    return res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    users_collection.aggregate([{
                            $unwind: '$clinic_details'
                        },
                        {
                            $match: {
                                roles: {
                                    $in: ["Doctor"]
                                }
                            }
                        }
                    ], function(err, clinicsResult) {
                        // console.log('clinicsResult  ========== ' + JSON.stringify(clinicsResult));

                        if (err) {
                            return res.json({
                                token: req.user.token,
                                status: 'failed',
                                reason: err
                            });
                        } else {
                            // return res.json({
                            //     token: req.user.token,
                            //     data: clinicsResult
                            // });
                            var appointments = [];
                            for (var i = 0; i < data.length; i++) {
                                // console.log("i = " + i)
                                // console.log("data[i] " + JSON.stringify(data[i].doctor_id))

                                if (data[i].clinic_id) {

                                    var index = clinicsResult.findIndex(function(o) {
                                        return o.clinic_details._id.toString() == data[i].clinic_id.toString();
                                    });


                                    if (index > -1) {
                                        var clinic = clinicsResult[index];
                                        data[i].clinic_id = clinic.clinic_details;

                                        if (data[i].doctor_id) {
                                            if (data[i].doctor_id.specialities) {
                                                // console.log("test = " + typeof data[i].doctor_id.specialities)
                                                if (typeof data[i].doctor_id.specialities != 'string') {
                                                    data[i].doctor_id.specialities = data[i].doctor_id.specialities[0]
                                                } else {
                                                    data[i].doctor_id.specialities = data[i].doctor_id.specialities
                                                }
                                            }
                                        }

                                        // //Array
                                        // data[i].doctor_id.specialities = data[i].doctor_id.specialities[0]
                                        // //String
                                        // data[i].doctor_id.specialities = data[i].doctor_id.specialities

                                        appointments.push(data[i])
                                    } else {
                                        if (data[i].doctor_id) {
                                            if (data[i].doctor_id.specialities) {
                                                // console.log("test = " + typeof data[i].doctor_id.specialities)
                                                if (typeof data[i].doctor_id.specialities != 'string') {
                                                    data[i].doctor_id.specialities = data[i].doctor_id.specialities[0]
                                                } else {
                                                    data[i].doctor_id.specialities = data[i].doctor_id.specialities
                                                }
                                            }
                                        }

                                        data[i].clinic_id = {};
                                        appointments.push(data[i])
                                    }
                                }
                                // console.log(appointments.length + " --- " + data.length)
                                // if (appointments.length == data.length) {
                                //     // console.log("appointments = " + JSON.stringify(appointments))
                                //     return res.json({
                                //         status: 'ok',
                                //         token: req.user.token,
                                //         data: appointments
                                //     });
                                // }
                            }
                            return res.json({
                                status: 'ok',
                                token: req.user.token,
                                data: appointments
                            });
                        }
                    })


                }
            });

    } else if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        return res.json({
            token: req.user.token,
            status: 'failed',
            reason: 'Login required for this page'
        });
    }
}

function listAllAppointments(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    var isDoctorIndex = req.user.roles.indexOf('Doctor');
    var isPatientIndex = req.user.roles.indexOf('Patient');

    // console.log(isDoctorIndex + " --- " + isPatientIndex)

    if (isDoctorIndex > -1) {
        calendarEvents_collection.find({
                doctor_id: ObjectId(req.user.id),
                active: true
            })
            .populate('patient_id', '_id first_name last_name')
            .populate('doctor_id', '_id first_name last_name')
            .sort('-create_date')
            .exec(function(err, docs) {
                if (err) {
                    return res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    return res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            })
    } else if (isPatientIndex > -1) {
        calendarEvents_collection.find({
                patient_id: ObjectId(req.user.id),
                active: true
            })
            .populate('patient_id', '_id first_name last_name')
            .populate('doctor_id', '_id first_name last_name')
            .sort('-create_date')
            .exec(function(err, docs) {
                if (err) {
                    return res.json({
                        token: req.user.token,
                        status: 'failed',
                        reason: err
                    });
                } else {
                    return res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: docs
                    });
                }
            })
    }
}

function updateAppointmentDetails(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    var appointmentDetails = req.body.appointmentDetails;
    var inTime = moment();

    calendarEvents_collection.find({
            _id: ObjectId(appointmentDetails.appointmentId)
        })
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    token: req.user.token,
                    status: 'failed',
                    reason: err
                });
            } else {
                var updatedAppointment = calendarEvents_collection(resp[0]);
                var sendnotificationtopatient = false;
                if (appointmentDetails.status == 'Patient Entered') {

                    updatedAppointment.appointment_details.in_time = inTime;

                } else if (appointmentDetails.status == 'RMO Assigned') {

                    updatedAppointment.appointment_details.rmo = ObjectId(appointmentDetails.rmo)
                    updatedAppointment.appointment_details.rmo_in_time = inTime;
                    sendnotificationtopatient = true;
                } else if (appointmentDetails.status == 'Consultant Assigned') {

                    updatedAppointment.appointment_details.consultant = ObjectId(appointmentDetails.consultant)
                    updatedAppointment.appointment_details.consultant_in_time = inTime;
                    sendnotificationtopatient = true;
                }

                updatedAppointment.appointment_details.status = appointmentDetails.status

                updatedAppointment.save(function(err, response) {
                    if (err) {
                        return res.json({
                            status: 'failed',
                            reason: 'Could not save user',
                            token: req.user.token
                        });
                    } else {
                        calendarEvents_collection.find({
                                _id: ObjectId(appointmentDetails.appointmentId)
                            })
                            .populate('patient_id', '_id first_name last_name')
                            .populate('doctor_id', '_id first_name last_name')
                            .exec(function(err, resp) {
                                if (err) {
                                    return res.json({
                                        status: 'failed',
                                        reason: err,
                                        token: req.user.token
                                    });
                                } else {
                                    if (appointmentDetails.status == 'Patient Entered') {
                                        // get clinicname with respect to appointment id appointmentDetails.appointmentId
                                        var clinicid = resp[0].clinic_id;
                                        users_collection.find({ "clinic_details._id": ObjectId(clinicid) }).select('clinic_details').exec(function(err1, resp1) {
                                            var clinicname = "";
                                            for (var i = 0; i < resp1[0].clinic_details.length; i++) {
                                                if (resp1[0].clinic_details[i]._id.toString() == clinicid.toString()) {
                                                    clinicname = resp1[0].clinic_details[i].general.name
                                                }
                                            }
                                            // console.log(resp1[0].clinic_details);
                                            var info = "Welcome to " + clinicname;
                                            var notificationObj = {
                                                info: info,
                                                type: "38",
                                                timestamp: moment(),
                                                sender: req.user.id,
                                                for: resp[0].patient_id._id,
                                                isPushNotification: "true"
                                            }
                                            notificationService.serverNotification(notificationObj);
                                        });
                                    } else if (sendnotificationtopatient) {
                                        // var notificaitonMetadata = {
                                        //     refId: clinic.id
                                        // };
                                        var info = "Dr. " + resp[0].doctor_id.first_name + " " + resp[0].doctor_id.last_name + " is in for their appointment with you.";
                                        var notificationObj = {
                                            info: info,
                                            type: "37",
                                            timestamp: moment(),
                                            sender: req.user.id,
                                            for: resp[0].patient_id._id,
                                            isPushNotification: "true"
                                        }
                                        notificationService.serverNotification(notificationObj);
                                    }
                                    // var appointmentNotificationObj = {
                                    //     sender: req.user.id,
                                    //     patient: resp[0].patient_id,
                                    //     info: resp[0].patient_id.first_name + ' ' + resp[0].patient_id.last_name + ' is in for their appointment with you.',
                                    // }
                                    // if (appointmentDetails.status == 'RMO Assigned') {
                                    //     appointmentNotificationObj.for = [appointmentDetails.rmo]
                                    // } else if (appointmentDetails.status == 'Consultant Assigned') {
                                    //     appointmentNotificationObj.for = [appointmentDetails.consultant]
                                    // }
                                    // notificationService.servePopUpNotificaiton(appointmentNotificationObj);

                                    return res.json({
                                        status: 'ok',
                                        message: 'User Updated',
                                        data: resp
                                    });
                                }
                            });
                    }
                });

            }
        })
}

function deleteAppointmentDetails(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    var appointmentDetails = req.body.appointmentDetails;
    var inTime = moment();

    calendarEvents_collection.find({
            _id: ObjectId(appointmentDetails.appointmentId)
        })
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    token: req.user.token,
                    status: 'failed',
                    reason: err
                });
            } else {
                var updatedAppointment = calendarEvents_collection(resp[0]);

                if (appointmentDetails.status == 'Patient Entered') {

                    updatedAppointment.appointment_details.in_time = undefined;

                } else if (appointmentDetails.status == 'RMO Assigned') {

                    updatedAppointment.appointment_details.rmo_in_time = undefined;

                } else if (appointmentDetails.status == 'Consultant Assigned') {

                    updatedAppointment.appointment_details.consultant_in_time = undefined;

                }
                console.log(JSON.stringify(updatedAppointment.appointment_details));
                updatedAppointment.appointment_details.status = appointmentDetails.status

                updatedAppointment.save(function(err, response) {
                    if (err) {
                        console.log(err);
                        return res.json({
                            status: 'failed',
                            reason: 'Could not save user',
                            token: req.user.token
                        });
                    } else {
                        calendarEvents_collection.find({
                                _id: ObjectId(appointmentDetails.appointmentId)
                            })
                            .populate('patient_id', '_id first_name last_name')
                            .populate('doctor_id', '_id first_name last_name')
                            .exec(function(err, resp) {
                                if (err) {
                                    return res.json({
                                        status: 'failed',
                                        reason: err,
                                        token: req.user.token
                                    });
                                } else {
                                    // var appointmentNotificationObj = {
                                    //     sender: req.user.id,
                                    //     patient: resp[0].patient_id,
                                    //     info: resp[0].patient_id.first_name + ' ' + resp[0].patient_id.last_name + ' is in for their appointment with you.',
                                    // }
                                    // if (appointmentDetails.status == 'RMO Assigned') {
                                    //     appointmentNotificationObj.for = [appointmentDetails.rmo]
                                    // } else if (appointmentDetails.status == 'Consultant Assigned') {
                                    //     appointmentNotificationObj.for = [appointmentDetails.consultant]
                                    // }
                                    // notificationService.servePopUpNotificaiton(appointmentNotificationObj);

                                    return res.json({
                                        status: 'ok',
                                        message: 'User Updated',
                                        data: resp
                                    });
                                }
                            });
                    }
                });

            }
        })
}

function rescheduleAppointments(req, res) {

    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }
    console.log("req.body " + JSON.stringify(req.body))
    var finalData = req.body;
    var appointmentDate = new Date(req.body.rescheduleAppointmentsDetails.appointmentDate)
    var currentDate = new Date();

    var finalData = [];

    req.body.appointmentsToBeSaved.forEach(function(appointments) {
        var startTime = new Date(appointments.start_time)
        var endTime = new Date(appointments.end_time)

        startTime.setFullYear(appointmentDate.getFullYear())
        startTime.setMonth(appointmentDate.getMonth())
        startTime.setDate(appointmentDate.getDate());
        startTime.setHours(appointmentDate.getHours());
        startTime.setMinutes(appointmentDate.getMinutes());

        endTime.setFullYear(appointmentDate.getFullYear())
        endTime.setMonth(appointmentDate.getMonth())
        endTime.setDate(appointmentDate.getDate());
        endTime.setHours(appointmentDate.getHours());
        endTime.setMinutes(appointmentDate.getMinutes());


        var appointmentData = {
            appointmentId: appointments.appointmentId,
            start_time: startTime,
            end_time: endTime
        }

        finalData.push(appointmentData)
    })

    var tasks = []

    var numberOfData = finalData.length;
    var count = 0;

    finalData.forEach(function(appt) {
        calendarEvents_collection.findOne({
            _id: ObjectId(appt.appointmentId)
        }).exec(function(err, resp) {
            if (err) {
                // console.log("err = " + err)
                count = count + 1;

                // console.log(numberOfData + " - error - " + count)
                if (count == numberOfData) {
                    return res.json({
                        status: 'ok',
                        token: req.user.token
                    })
                }

            } else {
                var updatedAppointment = calendarEvents_collection(resp)

                updatedAppointment.start_time = appt.start_time
                updatedAppointment.end_time = appt.end_time

                updatedAppointment.save(function(err, data) {
                    if (err) {
                        return res.json({
                            status: 'failed',
                            reason: err,
                            token: req.user.token
                        })
                    } else {
                        var patientID = data.patient_id;
                        var doctorID = data.doctor_id;
                        var ids = [];
                        ids.push(patientID);
                        ids.push(doctorID);
                        var info = "Your appointment has been rescheduled."
                        var appointmentNotificationObj = {
                            info: info,
                            type: "4",
                            timestamp: moment(),
                            sender: patientID,
                            isPushNotification: "true",
                            for: ids
                        }
                        notificationService.serverNotification(appointmentNotificationObj);

                        count = count + 1;

                        if (count == numberOfData) {
                            return res.json({
                                status: 'ok',
                                data: data
                            })
                        }

                    }
                })
            }

        })
    })
}

function cancelDoctorAppointment(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }
    var finalData = req.body;
    console.log("finalData " + JSON.stringify(finalData))
    var cancellingReason = finalData.cancellingReason;
    // console.log("cancellingReason " + JSON.stringify(cancellingReason))

    var reason = '';
    if (cancellingReason.cancelReason == "other") {
        reason = cancellingReason.otherReason;
        console.log("reason " + reason)
    } else {
        reason = cancellingReason.cancelReason;
        console.log("reason " + reason)
    }


    var appointmentsToCancel = finalData.appointmentsToCancel;
    // console.log("appointmentsToCancel  " + JSON.stringify(appointmentsToCancel))
    var numberOfData = appointmentsToCancel.length;
    var count = 0;
    appointmentsToCancel.forEach(function(appt) {
        calendarEvents_collection.findOne({
            _id: ObjectId(appt.appointmentId)
        }).exec(function(err, resp) {
            if (err) {
                count = count + 1;

                // console.log(numberOfData + " - error - " + count)
                if (count == numberOfData) {
                    return res.json({
                        status: 'ok',
                        token: req.user.token
                    })
                }
            } else {
                var cancelAppointment = calendarEvents_collection(resp)

                cancelAppointment.active = false
                    // console.log("appointmentsToCancel.cancelReason " + reason)
                cancelAppointment.cancel_reason = reason

                cancelAppointment.save(function(err, data) {
                    if (err) {
                        return res.json({
                            status: 'failed',
                            reason: err,
                            token: req.user.token
                        })
                    } else {
                        auditLog.registerAuditLog(req, req.user.id, null, resp, cancelAppointment, 'Appointment Cancelled');

                        var patientID = data.patient_id;
                        var doctorID = data.doctor_id;
                        var ids = [];
                        ids.push(patientID);
                        ids.push(doctorID);
                        var info = "Your appointment has been cancelled."
                        var appointmentNotificationObj = {
                            info: info,
                            type: "5",
                            timestamp: moment(),
                            sender: patientID,
                            isPushNotification: "true",
                            for: ids

                        }
                        notificationService.serverNotification(appointmentNotificationObj);

                        count = count + 1;

                        if (count == numberOfData) {
                            return res.json({
                                status: 'ok',
                                data: data
                            })
                        }
                    }
                })
            }


        })
    })
}


function addFollowUp(req, res) {

    //Test Toaster

    //
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }
    calendarEvents_collection.findOne({
        _id: ObjectId(req.body.appointmentObj.appointmentId)
    }, function(err, resp) {
        if (err) {
            return res.json({
                status: 'failed',
                reason: err,
                token: req.user.token
            })
        } else {
            // console.log("resp = " + JSON.stringify(resp))
            var addressName = resp.patient_address ? resp.patient_address.name : '';
            var clinicName = resp.patient_address ? resp.patient_address.clinic_name : '';
            var addressLineOne = resp.patient_address ? resp.patient_address.address_line_one : '';

            var phone_number = resp.patient_address ? resp.patient_address.phone_number : '';
            var email = resp.patient_address ? resp.patient_address.email : '';
            var city = resp.patient_address ? resp.patient_address.city : '';
            var state = resp.patient_address ? resp.patient_address.state : '';

            var gender = resp.other_details ? resp.other_details.gender : '';
            var patient_type = resp.other_details ? resp.other_details.patient_type : '';
            var appointmentDetails = new calendarEvents_collection({
                user_id: resp.user_id,
                patient_id: resp.patient_id,
                reason: resp.reason,
                doctor_id: resp.doctor_id,
                start_time: moment(req.body.appointmentObj.appointmentTime),
                end_time: moment(req.body.appointmentObj.appointmentTime),
                patient_address: {
                    name: addressName,
                    email: email,
                    clinic_name: clinicName,
                    address_line_one: addressLineOne,
                    phone_number: phone_number,
                    city: city,
                    state: state
                },
                other_details: {
                    age: resp.age,
                    gender: gender,
                    patient_type: patient_type,
                },
                clinic_id: resp.clinic_id,
                appointment_details: {
                    appointment_time: moment(req.body.appointmentObj.appointmentTime)
                },
                active: true,
                create_date: moment(),
                invitees: resp.invitees,
                calendar_name: resp.calendar_name
            })
            appointmentDetails.save(function(err, data) {
                if (err) {
                    console.log('Appointment not saved ' + err);
                    res.json({
                        token: req.user.token,
                        status: "failed",
                        reason: err
                    });
                } else {
                    console.log('Appointment saved successfully!');

                    if (appointmentDetails.calendar_name == "Appointments") {
                        users_collection.findOne({
                                _id: ObjectId(appointmentDetails.patient_id)
                            })
                            .exec(function(err, user) {
                                if (err) {
                                    res.json({
                                        token: req.user.token,
                                        status: "failed",
                                        reason: 'User not found'
                                    });
                                } else {
                                    // var updatedUser = users_collection(user)

                                    var date = new Date();
                                    var opdNumber = generateOPDNumber(user, resp.doctor_id, function(err, result) {
                                        if (err) {
                                            console.log('Unable to save OPD');
                                        } else {
                                            var opdNumber = result;
                                            // console.log(opdNumber + " ---- " + data._id)
                                            var visit = {
                                                OPDNumber: opdNumber,
                                                appointmentId: ObjectId(data._id),
                                                doctor: {
                                                    doctor_id: resp.doctor_id
                                                }
                                            }

                                            visit.prescription = [{}];
                                            visit.advice = {
                                                services: [],
                                                statTests: [],
                                                procedures: [],
                                                referTo: [],
                                                pathologyTests: [],
                                                radiologyTests: []
                                            };

                                            visit.bp = {};
                                            visit.serviceCharges = 0;
                                            visit.statTestCharges = 0;
                                            visit.procedureCharges = 0
                                            visit.expectedTestCharges = 0;
                                            visit.charges = 0;
                                            visit.pathologyTestCharges = 0;
                                            visit.radiologyTestCharges = 0;

                                            visit.advice.dietPlan = {};
                                            visit.advice.eventDiagnosis = {};
                                            visit.findings = {};
                                            visit.findings.orthopedic = {};
                                            visit.findings.orthopedic.bones = {};
                                            visit.findings.orthopedic.bones.fracture = {};
                                            visit.findings.orthopedic.bones.fracture.upperExtremity = [];
                                            visit.findings.orthopedic.bones.mass = {};
                                            visit.findings.orthopedic.bones.mass.skull = [];
                                            visit.findings.orthopedic.bones.mass.chest = []
                                            visit.findings.orthopedic.upperExtremity = {};
                                            visit.findings.orthopedic.bones.mass.upperExtremity = [];
                                            visit.findings.orthopedic.bones.mass.lowerExtremity = [];
                                            visit.complaint = {
                                                text: ''
                                            };

                                            // console.log(JSON.stringify(visit))
                                            user.visits.push(visit)
                                                //
                                            user.save(function(err, resp) {
                                                if (err) {
                                                    console.log("OPD number could not be saved " + err)
                                                } else {

                                                    console.log("OPD number saved!")
                                                }
                                            })
                                        }
                                    });


                                }
                            })
                    }

                    var doctor = appointmentDetails.doctor_id;
                    var patient = appointmentDetails.patient_id;


                    var currentTime = moment();
                    var me = req.user.id;
                    var my_name = ""

                    users_collection.find({
                            '_id': ObjectId(me)
                        })
                        .exec(function(err, resp) {
                            if (err) {
                                console.log(err)
                            } else {

                                my_name = resp[0].first_name + " " + resp[0].last_name;

                                //var notificaitonMetadata = {};

                                var infoText = "Created by me reason: " + appointmentDetails.reason + " on: " + moment(appointmentDetails.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentDetails.endTime).format('h:mm A');
                                var appointmentNotificationObj = {
                                    info: infoText,
                                    type: "1",
                                    timestamp: currentTime,
                                    sender: me,
                                    for: [patient],
                                    isPushNotification: "true",
                                    metadata: null
                                }
                                notificationService.serverNotification(appointmentNotificationObj);


                                var infoTextForDoctor = "Created for you by " + my_name + " reason: " + appointmentDetails.reason + " on: " + moment(appointmentDetails.startTime).format('DD/MM/YYYY') + " at " + moment(appointmentDetails.endTime).format('h:mm A');
                                var appointmentNotificationObjForDoc = {
                                    info: infoTextForDoctor,
                                    type: "1",
                                    timestamp: currentTime,
                                    sender: me,
                                    for: [doctor],
                                    isPushNotification: "true",
                                    metadata: null
                                }
                                notificationService.serverNotification(appointmentNotificationObjForDoc);

                            }
                        });

                }
            });
        }

        return res.json({
            token: req.user.token,
            status: "ok"
        });
    })

    // return res.json({
    //     token: req.user.token,
    //     status: "ok"
    // });
}

function saveserviceandnotify(req, res) {
    calendarEvents_collection.findOne({
            _id: ObjectId(req.body.appointmentId)
        })
        .populate('patient_id', '_id first_name last_name roles email mmobile')
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err,
                    token: req.user.token
                })
            } else {
                var patient_name = resp.patient_id.first_name + " " + resp.patient_id.last_name;
                var id = resp.doctor_id;
                users_collection.find({ "access.access_for": ObjectId(id), "access.permissions": { $in: ['Read Appointment'] } }).select('_id')
                    .exec(function(err, user) {
                        var ids = [];
                        for (var i = 0; i < user.length; i++) {
                            ids.push(user[i]._id)
                        }
                        var data = {
                            _id: ids,
                            msg: "Dr " + req.user.name + " Assigned some Services to " + patient_name + " Kindly Allocate Sister!"
                        }
                        var shouldnotifyfd = false;
                        users_collection.findOne({ "visits.appointmentId": ObjectId(req.body.appointmentId) }).exec(function(err, respuser) {
                            for (var i = 0; i < respuser.visits.length; i++) {
                                if (respuser.visits[i].appointmentId == req.body.appointmentId) {
                                    if (respuser.visits[i].advice != undefined && respuser.visits[i].advice.services != undefined && respuser.visits[i].advice.services.length > 0) {
                                        for (var j = 0; j < respuser.visits[i].advice.services.length; j++) {
                                            if (!respuser.visits[i].advice.services[j].notifiedToFrontdesk) {
                                                respuser.visits[i].advice.services[j].notifiedToFrontdesk = true;
                                                shouldnotifyfd = true;
                                            } else if (respuser.visits[i].advice.services[j].notifiedToFrontdesk == undefined) {
                                                respuser.visits[i].advice.services[j].notifiedToFrontdesk = true;
                                                shouldnotifyfd = true;
                                            }
                                        }
                                    }
                                }
                            }
                            if (shouldnotifyfd) {
                                respuser.save(function(err, respsave) {
                                    SOCKET.broadcast.emit("serviceToastReceived", data);
                                    SOCKET.emit("serviceToastReceived", data);
                                });
                            }
                        })
                        return res.json({
                            token: req.user.token,
                            status: "ok"
                        });
                    });
            }
        })
}

function addGeneralEvent(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    if (req.user.id) {

        var invitees = [];
        var speakers = [];
        var spot_fees = 0;
        var fees = 0;
        var association = '';
        var brochureImageUrl = '';
        var pptUrl = '';

        if (req.body.invitees) {
            invitees = req.body.invitees.split(",")
        }
        if (req.body.speakers) {
            speakers = req.body.speakers.split(",")

        }
        var venue = {
            address_line_three: req.body.city
        }
        if (req.body.spot_fees) {
            spot_fees = parseInt(req.body.spot_fees)
        }
        if (req.body.fees) {
            fees = parseInt(req.body.fees)
        }
        if (req.body.association) {
            association = req.body.association
        }
        if (req.body.imageUrl) {
            // console.log(req.body.imageUrl);
            brochureImageUrl = req.body.imageUrl;
        }
        if (req.body.pptUrl) {
            // console.log(req.body.pptUrl);
            pptUrl = req.body.pptUrl;
        }

        var eventDetails = {
            association: association,
            speakers: speakers,
            request_for_sponsorship: req.body.requestForSponsorship,
            event_type: req.body.eventType,
            fees: fees,
            ticket_url: req.body.ticketUrl,
            type_of_event: req.body.typeOfEvent,
            spot_fees: spot_fees,
            event_attachment: {
                url: brochureImageUrl
            },
            ppt_attachment: {
                url: pptUrl
            }
        }


        if (req.body.is_credit_applicable === 'True') {
            var points = {
                is_applicable: true,
                points: parseFloat(req.body.creditPoints)
            }

            eventDetails.credit_points = points
        }

        var form_data = new calendarEvents_collection({
            user_id: req.user.id,
            calendar_name: req.body.calendarName || "Events",
            invitees: invitees,
            description: req.body.description,
            title: req.body.title,
            create_date: moment(),
            start_time: req.body.startTime,
            end_time: req.body.endTime,
            venue_address: venue,
            event_details: eventDetails
        });

        form_data.save(function(err, data) {
            if (err) {
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                if (invitees) {
                    users_collection.find({
                        email: {
                            $in: invitees
                        }
                    }, function(err, userData) {
                        if (err) {
                            console.log("User not found")
                        } else {

                            if (userData.length > 0) {
                                var allInvitees = [];
                                userData.forEach(function(user) {
                                    allInvitees.push(user._id)
                                })

                                var notificaitonMetadata = {
                                    reference_id: data._id
                                }

                                var infoText = "You have been invited to the " + req.body.title + " Event";
                                var appointmentNotificationObj = {
                                    info: infoText,
                                    type: "6",
                                    timestamp: moment(),
                                    sender: req.user._id,
                                    for: allInvitees,
                                    isPushNotification: "true",
                                    metadata: notificaitonMetadata
                                }
                                notificationService.serverNotification(appointmentNotificationObj);
                            }
                        }
                    })
                }


                return res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        });
    } else if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason
        });
    } else {
        res.json({
            status: "failed",
            reason: "No such user/event found"
        });
    }
}

function listTypeOfEvents(req, res) {

    var sortBy;
    var searchTerm;

    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    if (req.body.sortBy) {
        // console.log(req.body.sortBy)
        sortBy = req.body.sortBy
    }
    if (req.body.searchTerm) {
        // console.log(req.body.sortBy)
        searchTerm = req.body.searchTerm
    }


    users_collection.findOne({
            _id: ObjectId(req.user.id)
        })
        .select("email")
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err,
                    token: res.user.token
                })
            } else {
                var condition = [{
                        $match: {
                            $and: [{
                                        $or: [{
                                                'event_details.type_of_event': 'Open'
                                            },
                                            {
                                                "invitees": {
                                                    $in: [resp.email]
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        "calendar_name": 'Events',
                                    }
                                ] // $and
                        } // $match
                    }, // Aggregate stage 1
                    {
                        $addFields: {
                            "totalInterestedUsers": {
                                $size: "$event_details.interested_users"
                            }
                        } // Add fields
                    }, // Aggregate Stage 2
                    {
                        $sort: {
                            sortBy: 1
                        } // Sort to be added later since 'sortBy' is a variable, its value is to be used as a key 
                    }

                ];

                if (sortBy) {
                    // console.log(sortBy);
                    condition[2].$sort[sortBy] = 1
                    if (sortBy === "create_date") {
                        condition[2].$sort[sortBy] = -1
                    }
                }

                // console.log(JSON.stringify(condition))


                if (req.body.eventType) {
                    condition[0].$match.$and.push({
                        'event_details.event_type': req.body.eventType
                    })
                }
                if (searchTerm) {
                    condition[0].$match.$and.push({
                        'title': new RegExp(searchTerm, 'gi')
                    })
                }
                console.log(new RegExp(searchTerm));

                console.log(JSON.stringify(condition));


                calendarEvents_collection.aggregate(condition)
                    // .select('title start_time create_date venue_address event_attachment event_details')
                    .exec(function(err, resp) {
                        if (err) {
                            return res.json({
                                status: 'failed',
                                reason: err,
                                token: req.user.token
                            })
                        } else {
                            resp.forEach(function(item) {
                                item.numberOfInterested = item.event_details.interested_users.length;
                            })
                            return res.json({
                                status: 'ok',
                                token: req.user.token,
                                data: resp
                            })
                        }
                    })

            }
        })

}

function searchTypeOfEvents(req, res) {

    var sortBy;
    var keyword;

    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    if (!req.body.keyword) {
        return res.json({
            status: 'failed',
            reason: 'missing keyword',
            token: req.user.token
        })
    } else {
        keyword: req.body.keyword
    }

    if (req.body.sortBy) {
        // console.log(req.body.sortBy)
        sortBy = req.body.sortBy
    }


    users_collection.findOne({
            _id: ObjectId(req.user.id)
        })
        .select("email")
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err,
                    token: res.user.token
                })
            } else {
                var condition = [{
                        $match: {
                            $and: [{
                                        $or: [{
                                                'event_details.type_of_event': 'Open'
                                            },
                                            {
                                                "invitees": {
                                                    $in: [resp.email]
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        "calendar_name": 'Events',
                                    }
                                ] // $and
                        } // $match
                    }, // Aggregate stage 1
                    {
                        $addFields: {
                            "totalInterestedUsers": {
                                $size: "$event_details.interested_users"
                            }
                        } // Add fields
                    }, // Aggregate Stage 2
                    {
                        $sort: {
                            sortBy: 1
                        } // Sort to be added later since 'sortBy' is a variable, its value is to be used as a key 
                    }

                ];

                if (sortBy) {
                    // console.log(sortBy);
                    condition[2].$sort[sortBy] = 1
                    if (sortBy === "create_date") {
                        condition[2].$sort[sortBy] = -1
                    }
                }

                // console.log(JSON.stringify(condition))


                if (req.body.eventType) {
                    condition[0].$match.$and.push({
                        'event_details.event_type': req.body.eventType
                    })
                }

                calendarEvents_collection.aggregate(condition)
                    // .select('title start_time create_date venue_address event_attachment event_details')
                    .exec(function(err, resp) {
                        if (err) {
                            return res.json({
                                status: 'failed',
                                reason: err,
                                token: req.user.token
                            })
                        } else {
                            resp.forEach(function(item) {
                                item.numberOfInterested = item.event_details.interested_users.length;
                            })
                            return res.json({
                                status: 'ok',
                                token: req.user.token,
                                data: resp
                            })
                        }
                    })

            }
        })

}

function listEventDetails(req, res) {

    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    if (req.body.eventId) {
        calendarEvents_collection.findOne({
                _id: ObjectId(req.body.eventId)
            })
            .populate('event_details.interested_users', '_id first_name last_name roles email mmobile')
            .exec(function(err, resp) {
                if (err) {
                    return res.json({
                        status: 'failed',
                        reason: err,
                        token: req.user.token
                    })
                } else {
                    return res.json({
                        status: 'ok',
                        token: req.user.token,
                        data: resp
                    })
                }
            })
    } else {
        return res.json({
            status: 'failed',
            reason: 'Event Id Not specified',
            token: req.user.token
        })
    }
}

function changeInterest(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }

    if (req.body.eventId) {
        calendarEvents_collection.findOne({
                _id: ObjectId(req.body.eventId)
            })
            .exec(function(err, resp) {
                if (err) {
                    return res.json({
                        status: 'failed',
                        token: req.user.token,
                        reason: err
                    })
                } else {
                    var updatedEvent = calendarEvents_collection(resp)
                    var isInterested;

                    var interestedUser = ObjectId(req.user.id)
                    var isInterested;

                    if (updatedEvent.event_details && updatedEvent.event_details.interested_users) {
                        var index = updatedEvent.event_details.interested_users.findIndex(function(user) {
                            return user.toString() == req.user.id.toString()
                        })

                        if (index > -1) {
                            updatedEvent.event_details.interested_users.splice(index, 1)
                            isInterested = false;
                        } else {
                            updatedEvent.event_details.interested_users.push(interestedUser)
                            isInterested = true;
                        }
                    } else {
                        if (updatedEvent.event_details) {
                            updatedEvent.event_details.interested_users = [interestedUser]
                        }
                    }

                    updatedEvent.save(function(err, response) {
                        if (err) {
                            return res.json({
                                status: 'failed',
                                reason: err,
                                token: req.user.token,
                            })
                        } else {
                            return res.json({
                                status: 'ok',
                                token: req.user.token,
                                isInterested: isInterested
                            })
                        }
                    })
                }
            })
    } else {
        return res.json({
            status: 'failed',
            reason: 'Event Id Not specified',
            token: req.user.token
        })
    }
}

function listMyEvents(req, res) {
    if (!req.user.id) {
        return res.json({
            status: 'failed',
            reason: 'Unauthorized User',
            token: req.user.token
        })
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        })
    }
    var find = {
        $and: [{
            user_id: ObjectId(req.user.id)
        }, {
            calendar_name: 'Events'
        }, ]
    }
    if (req.query.isInterested) {
        find = {
            $and: [{
                'event_details.interested_users': ObjectId(req.user.id)
            }, {
                calendar_name: 'Events'
            }, ]
        }

    }
    console.log(find);


    calendarEvents_collection.find(find)
        .populate('event_details.interested_users', '_id first_name last_name roles email mmobile')
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err,
                    token: req.user.token
                })
            } else {
                return res.json({
                    status: 'ok',
                    token: req.user.token,
                    data: resp
                })
            }
        })
}

function listOpenEvents(req, res) {

    var condition = {
        $and: [{
            'event_details.type_of_event': 'Open'
        }, {
            calendar_name: 'Events',
        }]
    }

    if (req.body.eventType) {
        condition.$and.push({
            'event_details.event_type': req.body.eventType
        })
    }

    calendarEvents_collection.find(condition)
        .select('title start_time create_date venue_address event_attachment event_details')
        .sort({
            start_time: -1
        })
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err
                })
            } else {
                return res.json({
                    status: 'ok',
                    data: resp
                })
            }
        })
}


function addReminder(req, res) {
    if (!req.user) {
        res.json({
            status: 'failed',
            reason: 'No such user',
        });
        return;
    }

    if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
        return;
    }

    var alterDetails = req.body;

    var repeat = {
        is_repeat: alterDetails.is_repeat,
        repeat_for: alterDetails.repeat_for
    }
    var reminder_details = {
        description: alterDetails.description,
        repeat: repeat
    }

    var calendarEvents = new calendarEvents_collection({
        user_id: req.user.id,
        calendar_name: req.body.calendarName || "Reminder",
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        reminder_details: reminder_details
    });

    // console.log("rcalendarEvents " + JSON.stringify(calendarEvents))

    calendarEvents.save(function(err, resp) {
        if (err) {
            return res.json({
                status: 'failed',
                reason: err,
                token: req.user.token
            });
        } else {
            return res.json({
                status: 'ok',
                token: req.user.token
            });
        }
    });

};

//listAllReminders Function
function listAllReminders(req, res) {

    if (!req.user) {
        res.json({
            status: 'failed',
            reason: 'No such user',
        });
        return;
    }

    if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
        return;
    }

    calendarEvents_collection.find({
            user_id: ObjectId(req.user.id),
            "calendar_name": "Reminder"
        })
        .exec(function(err, response) {
            if (err) {
                res.json({
                    token: req.user.token,
                    status: 'failed',
                    reason: err
                });
            } else {
                // console.log("response data  " + JSON.stringify(response))
                return res.json({
                    token: req.user.token,
                    status: 'ok',
                    data: response
                })
            }
        })

};

//WIP (Not working) still have some work to be done
function listDoctorsTimeSlots(req, res) {
    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    if (!req.body.clinicId) {
        return res.json({
            status: 'failed',
            reason: 'Clinic Id Not Provided',
        });
    }

    var clinicId = req.body.clinicId
    var doctorId = req.body.doctorId || req.user.id

    users_collection.aggregate({
        $unwind: '$clinic_details'
    }, {
        $match: {
            $and: [{
                    _id: ObjectId(doctorId)
                },
                {
                    $or: [{
                            'clinic_details._id': ObjectId(clinicId)
                        },
                        {
                            'clinic_details.clinic_id': ObjectId(clinicId)
                        }
                    ]
                }
            ]
        }
    }, function(err, resp) {
        if (err) {
            return res.json({
                status: 'failed',
                reason: err,
                token: req.user.token
            });
        } else {

            try {
                var userDetails = resp[0];
                if (userDetails.clinic_details) {
                    var clinic = userDetails.clinic_details

                    if (clinic.appointment_interval) {
                        var interval = clinic.appointment_interval;
                    } else {
                        var interval = '00:30:00';
                    }

                    var today = moment().format('dddd')

                    var dayIndex = clinic.general.timings.findIndex(function(time) {
                        return time.day == today
                    })

                    var todaysTimeSlots = clinic.general.timings[dayIndex];


                    var finalTiming = [];
                    var finalTimingEvening = [];

                    if (todaysTimeSlots) {
                        //For firstOne
                        var d0 = moment();
                        var min = todaysTimeSlots.time_open[0].split('.')[1].split(' ')[0];
                        var hour = todaysTimeSlots.time_open[0].split('.')[0];
                        d0.set({
                            'hour': todaysTimeSlots.time_open[0].split('.')[0],
                            'minute': min,
                        });
                        finalTiming.push(d0)
                        var currentSlot = todaysTimeSlots.time_open[0].toString().split(' ')[0]
                        var finalSlot = todaysTimeSlots.time_close[0].toString().split(' ')[0]

                        while (currentSlot != finalSlot) {
                            switch (interval) {
                                case '00:30:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '30') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 30
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    }
                                    // console.log("currentSlot " + currentSlot)
                                    break;
                                case '00:15:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '45') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 15
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                case '00:10:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '50') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 10
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                case '00:05:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '55') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                default:
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '55') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTiming.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                    // console.log("currentSlot " + JSON.stringify(currentSlot))
                            }
                            // console.log("currentSlot " + JSON.stringify(currentSlot))
                        }

                        //For second One
                        var d1 = moment();

                        var hour = todaysTimeSlots.time_open[1].split('.')[0];
                        var min = todaysTimeSlots.time_open[1].split('.')[1].split(' ')[0]
                        d1.set({
                            'hour': todaysTimeSlots.time_open[1].split('.')[0],
                            'minute': min,
                        });
                        finalTimingEvening.push(d1)
                        var currentSlot = todaysTimeSlots.time_open[1].toString().split(' ')[0]
                        var finalSlot = todaysTimeSlots.time_close[1].toString().split(' ')[0]

                        while (currentSlot != finalSlot) {
                            switch (interval) {
                                case '00:30:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '30') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime;
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 30
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                case '00:15:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '45') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 15
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                case '00:10:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '50') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 10
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                case '00:05:00':
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '55') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                                default:
                                    var splitedCurrentSlot = currentSlot.split('.');
                                    if (splitedCurrentSlot[1] == '55') {
                                        // if (splitedCurrentSlot[0] == '12') {
                                        //     splitedCurrentSlot[0] = '0'
                                        // }
                                        var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                        splitedCurrentSlot[1] = '00'
                                        var d2 = moment()
                                        d2.set({
                                            'hour': finalTime,
                                            'minute': splitedCurrentSlot[1],
                                        });
                                        finalTime = finalTime + "." + splitedCurrentSlot[1]
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    } else {
                                        var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                        var d2 = moment()
                                        d2.set({
                                            'hour': splitedCurrentSlot[0],
                                            'minute': finalTime,
                                        });
                                        finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                        finalTimingEvening.push(d2)
                                        currentSlot = finalTime
                                    }
                                    break;
                            }
                        }

                        var today = moment().startOf('day')
                        var tomorrow = moment(today).add(1, 'days')

                        calendarEvents_collection.find({
                                doctor_id: ObjectId(doctorId),
                                active: true,
                                calendar_name: "Appointments",
                                start_time: {
                                    $gte: today.toDate(),
                                    $lt: tomorrow.toDate()
                                }
                            })
                            .select('start_time')
                            .exec(function(err, resp) {
                                if (err) {
                                    return res.json({
                                        status: 'failed',
                                        reason: err,
                                        token: req.user.token
                                    })
                                } else {
                                    var appointments = resp
                                    var morningSlot = []
                                    var eveningSlot = []

                                    var notToIncludeSlots = []

                                    if (appointments.length == 0) {
                                        var data = {
                                            morningSlots: finalTiming,
                                            eveningSlots: finalTimingEvening
                                        }

                                        return res.json({
                                            status: 'ok',
                                            token: req.user.token,
                                            data: data
                                        })
                                    } else {
                                        appointments.forEach(function(appointment) {
                                            var apptTime = moment(appointment.start_time)
                                            var apptTimeHour = apptTime.hour()
                                            var apptTimeMin = apptTime.minute()


                                            finalTiming.forEach(function(time) {
                                                var newTime = moment(time)

                                                if (apptTimeHour == newTime.hour()) {
                                                    if (apptTimeMin == newTime.minute()) {
                                                        if (!(notToIncludeSlots.includes(time))) {
                                                            notToIncludeSlots.push(time)
                                                        }
                                                    }
                                                }
                                            })

                                            finalTimingEvening.forEach(function(time) {
                                                var newTime = moment(time)

                                                if (apptTimeHour == newTime.hour()) {
                                                    if (apptTimeMin == newTime.minute()) {
                                                        if (!(notToIncludeSlots.includes(time))) {
                                                            notToIncludeSlots.push(time)
                                                        }
                                                    }
                                                }
                                            })
                                        })

                                        morningSlot = finalTiming
                                        finalTiming.forEach(function(time) {
                                            var newTime = moment(time)

                                            if (notToIncludeSlots.includes(time)) {
                                                var index = morningSlot.findIndex(function(o) {
                                                    return o == time
                                                })
                                                morningSlot.splice(index, 1)
                                            }
                                        })

                                        eveningSlot = finalTimingEvening
                                        finalTimingEvening.forEach(function(time) {
                                            var newTime = moment(time)

                                            if (notToIncludeSlots.includes(time)) {
                                                var index = eveningSlot.findIndex(function(o) {
                                                    return o == time
                                                })
                                                eveningSlot.splice(index, 1)
                                            }
                                        })

                                        var data = {
                                            morningSlots: morningSlot,
                                            eveningSlots: eveningSlot
                                        }

                                        return res.json({
                                            status: 'ok',
                                            token: req.user.token,
                                            data: data
                                        })
                                    }
                                }
                            })
                    } else {
                        var data = {
                            morningSlots: [],
                            eveningSlots: []
                        }

                        return res.json({
                            status: 'ok',
                            token: req.user.token,
                            data: data
                        })
                    }
                }
            } catch (error) {
                console.log("Doctor Time Slot Error ", error.message)
            }
            //before else end
        }
    })
    console.log("End of API ")

}


function panelDoctorsTimeSlots(req, res) {
    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    if (!req.body.hospitalId) {
        return res.json({
            status: 'failed',
            reason: 'Hospital Id Not Provided',
        });
    }

    var hospitalId = req.body.hospitalId
    var doctorId = req.body.doctorId
    var interval = '00:15:00';;

    users_collection.aggregate({
        $unwind: '$hospital_details'
    }, {
        $match: {
            $and: [{
                'hospital_details._id': ObjectId(hospitalId)
            }]
        }
    }, function(err, resp) {
        if (err) {
            return res.json({
                status: 'failed',
                reason: err,
                token: req.user.token
            });
        } else {
            var userDetails = resp[0];
            var hospital = userDetails.hospital_details
            var doctorsPanel = hospital.doctors_panel;
            if (doctorId) {
                var doctorIndex = doctorsPanel.findIndex(function(item) {
                    return item.doctor_id == doctorId
                })
                var doctorDetails = doctorsPanel[doctorIndex];
            }

            var today = moment().format('dddd')
            var dayIndex = doctorDetails.timings.findIndex(function(time) {
                return time.day == today
            })
            var todaysTimeSlots = doctorDetails.timings[dayIndex];
            var finalTiming = [];
            var finalTimingEvening = [];

            if (todaysTimeSlots) {
                var d0 = moment();
                var min = todaysTimeSlots.time_open[0].split('.')[1].split(' ')[0];
                d0.set({
                    'hour': todaysTimeSlots.time_open[0].split('.')[0],
                    'minute': min,
                });
                finalTiming.push(d0)
                var currentSlot = todaysTimeSlots.time_open[0].toString().split(' ')[0]
                var finalSlot = todaysTimeSlots.time_close[0].toString().split(' ')[0]

                while (currentSlot != finalSlot) {
                    switch (interval) {
                        case '00:30:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '30') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 30
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:15:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '45') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 15
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:10:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '50') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 10
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:05:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '55') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        default:
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '55') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTiming.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                    }
                }

                //For second One
                var d1 = moment();
                var min = todaysTimeSlots.time_open[1].split('.')[1].split(' ')[0]
                d1.set({
                    'hour': todaysTimeSlots.time_open[1].split('.')[0],
                    'minute': min,
                });
                finalTimingEvening.push(d1)
                var currentSlot = todaysTimeSlots.time_open[1].toString().split(' ')[0]
                var finalSlot = todaysTimeSlots.time_close[1].toString().split(' ')[0]

                while (currentSlot != finalSlot) {
                    switch (interval) {
                        case '00:30:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '30') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 30
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:15:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '45') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 15
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:10:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '50') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 10
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        case '00:05:00':
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '55') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                        default:
                            var splitedCurrentSlot = currentSlot.split('.');
                            if (splitedCurrentSlot[1] == '55') {
                                // if (splitedCurrentSlot[0] == '12') {
                                //     splitedCurrentSlot[0] = '0'
                                // }
                                var finalTime = parseFloat(splitedCurrentSlot[0]) + 1
                                splitedCurrentSlot[1] = '00'
                                var d2 = moment()
                                d2.set({
                                    'hour': finalTime,
                                    'minute': splitedCurrentSlot[1],
                                });
                                finalTime = finalTime + "." + splitedCurrentSlot[1]
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            } else {
                                var finalTime = parseFloat(splitedCurrentSlot[1]) + 5
                                var d2 = moment()
                                d2.set({
                                    'hour': splitedCurrentSlot[0],
                                    'minute': finalTime,
                                });
                                finalTime = splitedCurrentSlot[0] + '.' + finalTime
                                finalTimingEvening.push(d2)
                                currentSlot = finalTime
                            }
                            break;
                    }
                }

                var today = moment().startOf('day')
                var tomorrow = moment(today).add(1, 'days')

                calendarEvents_collection.find({
                        doctor_id: ObjectId(doctorId),
                        active: true,
                        calendar_name: "Appointments",
                        start_time: {
                            $gte: today.toDate(),
                            $lt: tomorrow.toDate()
                        }
                    })
                    .select('start_time')
                    .exec(function(err, resp) {
                        if (err) {
                            return res.json({
                                status: 'failed',
                                reason: err,
                                token: req.user.token
                            })
                        } else {
                            var appointments = resp
                            var morningSlot = []
                            var eveningSlot = []

                            var notToIncludeSlots = []

                            if (appointments.length == 0) {
                                var data = {
                                    morningSlots: finalTiming,
                                    eveningSlots: finalTimingEvening
                                }

                                return res.json({
                                    status: 'ok',
                                    token: req.user.token,
                                    data: data
                                })
                            } else {
                                appointments.forEach(function(appointment) {
                                    var apptTime = moment(appointment.start_time)
                                    var apptTimeHour = apptTime.hour()
                                    var apptTimeMin = apptTime.minute()


                                    finalTiming.forEach(function(time) {
                                        var newTime = moment(time)

                                        if (apptTimeHour == newTime.hour()) {
                                            if (apptTimeMin == newTime.minute()) {
                                                if (!(notToIncludeSlots.includes(time))) {
                                                    notToIncludeSlots.push(time)
                                                }
                                            }
                                        }
                                    })

                                    finalTimingEvening.forEach(function(time) {
                                        var newTime = moment(time)

                                        if (apptTimeHour == newTime.hour()) {
                                            if (apptTimeMin == newTime.minute()) {
                                                if (!(notToIncludeSlots.includes(time))) {
                                                    notToIncludeSlots.push(time)
                                                }
                                            }
                                        }
                                    })
                                })

                                morningSlot = finalTiming
                                finalTiming.forEach(function(time) {
                                    var newTime = moment(time)

                                    if (notToIncludeSlots.includes(time)) {
                                        var index = morningSlot.findIndex(function(o) {
                                            return o == time
                                        })
                                        morningSlot.splice(index, 1)
                                    }
                                })

                                eveningSlot = finalTimingEvening
                                finalTimingEvening.forEach(function(time) {
                                    var newTime = moment(time)

                                    if (notToIncludeSlots.includes(time)) {
                                        var index = eveningSlot.findIndex(function(o) {
                                            return o == time
                                        })
                                        eveningSlot.splice(index, 1)
                                    }
                                })

                                var data = {
                                    morningSlots: morningSlot,
                                    eveningSlots: eveningSlot
                                }

                                return res.json({
                                    status: 'ok',
                                    token: req.user.token,
                                    data: data
                                })
                            }
                        }
                    })
            } else {
                var data = {
                    morningSlots: [],
                    eveningSlots: []
                }

                return res.json({
                    status: 'ok',
                    token: req.user.token,
                    data: data
                })
            }

        }
        // }
    })
}


/**
 * @author Vineet D'souza
 * @param {*} req 
 * @param {*} res 
 * @description This API is used to fetch the next and the previous Appointment According to the provided current appointment Id.
 * 
 * Note: If the Current Appointment is the last Appointment then the nextAppointment will be null ans also if the Current Appointment is the first Appointment then the previousAppointment will be null
 */
function listNextAndPrevAppointmnts(req, res) {
    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }

    if (!req.query.currentApptId) {
        return res.json({
            status: 'failed',
            reason: 'Current Appointment Id Not Provided',
        });
    }

    calendarEvents_collection.findOne({
            _id: ObjectId(req.query.currentApptId)
        })
        .select('clinic_id')
        .exec(function(err, resp) {
            if (err) {
                return res.json({
                    status: 'failed',
                    reason: err,
                    token: req.user.token
                });
            } else {
                var today = moment().startOf('day')
                var tomorrow = moment(today).add(1, 'days')

                calendarEvents_collection.find({
                        clinic_id: {
                            $in: resp.clinic_id
                        },
                        active: true,
                        calendar_name: "Appointments",
                        start_time: {
                            $gte: today.toDate(),
                            $lt: tomorrow.toDate()
                        },
                        doctor_id: ObjectId(req.user.id),
                        'appointment_details.appointment_for': 'Patient'
                    })
                    .populate('patient_id', '_id first_name last_name')
                    .populate('doctor_id', '_id first_name last_name')
                    .sort('start_time')
                    .exec(function(err, response) {
                        if (err) {
                            return res.json({
                                status: 'failed',
                                reason: 'Clinic not found',
                                token: req.user.token
                            });
                            return;
                        } else {
                            var previousAppt = null
                            var nextAppt = null

                            var index = response.findIndex(function(o) {
                                return o._id.toString() == req.query.currentApptId
                            })

                            if (index > -1) {
                                if (index != 0) {
                                    previousAppt = response[index - 1]
                                }
                                if (index != (response.length - 1)) {
                                    nextAppt = response[index + 1]
                                }
                            }

                            var finalData = {
                                previousAppointment: previousAppt,
                                nextAppointment: nextAppt
                            }

                            return res.json({
                                status: 'ok',
                                data: finalData
                            })
                        }
                    });
            }
        })
}

function addAmbulanceAppointment(req, res) {

    if (!req.user) {
        return res.json({
            status: 'failed',
            reason: 'No such user',
        });
    }

    if (req.user.reason) {
        return res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
    }
    var user = req.user
    if (req.body.ambulance_appointment_details && req.body.ambulance_id && req.body.start_time && req.body.end_time) {

        req.body.patient_id = req.user.id
        req.body.user_id = req.user.id
        req.body.calendar_name = "Ambulance Appointment"

        var form_data = new calendarEvents_collection(req.body);

        form_data.save(function(err, data) {
            if (err) {
                console.log('Event not saved ' + err);
                res.json({
                    token: req.user.token,
                    status: "failed",
                    reason: err
                });
            } else {
                auditLog.registerAuditLog(req, user._id, user._id, {}, data, 'Ambulance Searched');
                res.json({
                    token: req.user.token,
                    status: "ok"
                });
            }
        });
    } else {
        return res.json({
            status: 'failed',
            reason: 'ambulance_appointment_details or ambulance_id  or start_time or end_time missing',
            token: req.user.token
        });
    }

}

//getLastVisitDetail 
function getLastAppointmentVisitedDetail(req, res) {
    // console.log("Req.body " + JSON.stringify(req.body))
    // console.log("api hitting")
    if (!req.user) {
        res.json({
            status: 'failed',
            reason: 'No such user',
        });
        return;
    }

    if (req.user.reason) {
        res.json({
            status: 'failed',
            reason: req.user.reason,
            token: req.user.token
        });
        return;
    }

    var doctor_id = req.body.doctor_id;
    var patient_id = req.body.patient_id;

    calendarEvents_collection.find({
            $and: [{
                // "doctor_id": ObjectId("5abb5b012bee6805bd31f3a6")
                doctor_id: ObjectId(doctor_id)
            }, {
                // "patient_id": ObjectId("5abb5eee94ca2558209c8865")
                patient_id: ObjectId(patient_id)
            }]
        })
        .exec(function(err, response) {
            if (err) {
                res.json({
                    token: req.user.token,
                    status: 'failed',
                    reason: err
                });
            } else {
                // console.log("response " + JSON.stringify(response))
                if (response.length > 0) {
                    var length = response.length;
                    var index = length - 1;
                    var lastVisit = response[index]
                        // console.log("lastVisit " + JSON.stringify(lastVisit))
                    return res.json({
                        token: req.user.token,
                        status: 'ok',
                        data: lastVisit
                    })
                } else {
                    console.log("no response")
                    return res.json({
                        token: req.user.token,
                        status: 'No appointment found'
                    })
                }
            }
        })

};

module.exports = initCalendar