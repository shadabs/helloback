import {
    patientDetail
} from "./patient_profile_modal.controller";
import {
    labelReceiptModal
} from "./labelReceiptModal.component";

class AddWalkInController {
    constructor($scope, $http, $state, $timeout, $uibModalInstance, authorizedDataSourceService, LoginAsService, $uibModal, user, clinicData, S3DirectUploaderService, commonUtilsService, $window, $interval) {

        var userProxy = LoginAsService.getProxyDetails();
        $scope.patientdatashow = false;
        if ($window.location.href.includes('/doctor/')) {
            $scope.patientdatashow = true;
        } else if ($window.location.href.includes('/search/doctor')) {
            $scope.patientdatashow = true;
        }
        $scope.patientSelected = false;
        $scope.querieslist = [];
        $scope.patient = {};
        $scope.appointmentObj = {};
        $scope.appointmentObj.patient = {};
        $scope.appointmentObj.doctor_id = user._id;
        $scope.appointmentObj.appointmentDetails = {};
        $scope.appointmentObj.appointmentDetails.appointmentDate = new Date();

        var currentUser = user;
        $scope.rate = 0;
        $scope.isBlackFlagged = false
        $scope.isRedFlagged = false

        $scope.mrAppointmentObj = {}
        $scope.mrAppointmentObj.patient = {};
        $scope.mrAppointmentObj.appointmentDetails = {};
        $scope.mrAppointmentObj.appointmentDetails.appointmentDate = new Date();

        // $scope.selectedTab = "morning"
        $scope.morningTab = true;
        $scope.eveningTab = false;
        $scope.morningSlots = [];
        $scope.eveningSlots = [];

        //Visitor Variables start
        $scope.visitorAppointmentObj = {}
        $scope.visitorAppointmentObj.patient = {};
        $scope.visitorAppointmentObj.appointmentDetails = {};
        $scope.visitorAppointmentObj.appointmentDetails.appointmentDate = new Date();
        //Visitor Variables end

        $scope.selectedMainTab = 'patients'
        $scope.oldPatient = true;
        $scope.newPatient = false;
        $scope.timeSlot = true;

        $scope.patientTypeChange = function(type) {
            if (type == "New") {
                $scope.oldPatient = false;
                $scope.newPatient = true;
            } else {
                $scope.oldPatient = true;
                $scope.newPatient = false;
            }
        }

        $scope.sistersList = false;
        $scope.consultantsList = true;
        $scope.purposeTypeChange = function(type) {
            if (type == "Casualty") {
                $scope.timeSlot = false;
            } else {
                $scope.timeSlot = true;
            }
        }


        $scope.purposeTypeSelection = function(type) {
            if (type == "Services") {
                console.log()
                $scope.sistersList = true;
                $scope.consultantsList = false;
            } else {
                $scope.sistersList = false;
            }
        }

        $scope.selectedTab = function(selectedSlot) {
            if (selectedSlot == "morning") {
                $scope.morningTab = true;
                $scope.eveningTab = false;
            } else {
                $scope.eveningTab = true;
                $scope.morningTab = false;
            }
        }

        $scope.close = function() {
            $uibModalInstance.close();
        };

        $scope.reset = function() {
            $scope.register = {}; // reset form
        };
        $scope.openLabelReceiptModal = function() {
            var dialog = $uibModal.open({
                templateUrl: labelReceiptModal.templateUrl,
                controller: labelReceiptModal.controller,
                scope: $scope
            });
            dialog.result.then(function(response) {
                $state.reload();
            }, function(err) {
                console.log('error triggered');
                console.log(err);
            });
        }
        $scope.shareProfile = function(userdetails) {
            var modalInstance = $uibModal.open({
                templateUrl: './profile/shareProfile.html',
                controller: ModalInstanceCtrl,
                userdetails: userdetails,
                resolve: {
                    item: function() {
                        return userdetails;
                    }
                }
            });
        };
        $scope.showPatientRecord = function(patientId) {
            var dialog = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: patientDetail.templateUrl,
                controller: patientDetail.controller,
                size: 'lg',
                resolve: {
                    patientId: function() {
                        return patientId;
                    },
                    User: function() {
                        return currentUser;
                    }
                }
            });
            dialog.result.then(function(response) {
                if (!response) {
                    return;
                }
            }, function() {
                console.log('error triggered');
            });
        };
        $scope.user = user;
        $scope.getAllQueries = function() {
            authorizedDataSourceService.get('/api/user/consult-online/list')
                .then(function(response) {
                    if (response.status === 'ok') {
                        $scope.querieslist = response.data;
                    } else {
                        console.log('response.reason');
                        console.log(response.reason);
                    }
                }).catch(function(error) {
                    console.log('error')
                    console.log(error)
                });
        };
        $scope.gotoQueryDetails = function(query) {
            $state.go('onlineConsultationDetails', {
                consultation_id: query._id
            })
        }
        $scope.storeTime = function(id, appointmentIndex) {
            var index = $scope.allClincsList.findIndex(function(o) {
                return o._id === id;
            });
            if (index !== -1) {
                $scope.allClincsList[index].appointments[appointmentIndex].intime = moment().format('h:mm a');
            } else {
                alert('Sorry! Cannot take your intime')
            }
        };

        $scope.getFormattedDate = getFormattedDate

        function getFormattedDate(date) {
            return moment(date).format('h:mm a');
        }
        $scope.appointments = {};

        $scope.getpatient = function(key) {
            var patientSearch = {
                text: key
            };
            return authorizedDataSourceService.post('/api/patient/search', patientSearch)
                .then(function(response) {
                    if (response.status == "ok") {
                        // return response.data.map((item) => {
                        //     return item;
                        // });
                        var dataarray = [];
                        if ($scope.selectedMainTab == 'patients') {
                            response.data.forEach((item) => {
                                if (item.roles.indexOf('Patient') > -1) {
                                    dataarray.push(item);
                                }
                            });
                        } else {
                            response.data.forEach((item) => {
                                dataarray.push(item);
                            });
                        }
                        return dataarray;
                    } else {
                        console.log('response:', response.reason);
                        $scope.flashMessage = "Patient not available";
                    }
                })
                .catch(function(err) {
                    console.log('Update failed: ', err);
                    $scope.flashMessage = err;
                });
        };
        $scope.onClinicChanged = function() {

            $scope.clinicData = clinicData.selectedClinic;

            if (clinicData) {
                $scope.selectedClinic = clinicData.selectedClinic
                $scope.selectedinterval = clinicData.selectedinterval
                $scope.allClincsList = clinicData.allClincsList

                if (clinicData.selectedPatient) {
                    onPatientSelect(clinicData.selectedPatient)
                }

                if (clinicData.appointmentDate) {
                    $scope.appointmentObj.appointmentDetails = {};
                    $scope.appointmentObj.appointmentDetails.appointmentDate = clinicData.appointmentDate
                    $scope.appointmentObj.appointmentTime = clinicData.appointmentDate
                }
            }

            if ($scope.selectedClinic) {

                $scope.appointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.appointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.appointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.appointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.appointmentObj.hospital_id = $scope.selectedClinic._id;
            }

            if ($scope.selectedClinic) {

                $scope.visitorAppointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.visitorAppointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.visitorAppointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.visitorAppointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.visitorAppointmentObj.hospital_id = $scope.selectedClinic._id;
            }

            if ($scope.selectedClinic) {
                $scope.mrAppointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.mrAppointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.mrAppointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.mrAppointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.mrAppointmentObj.hospital_id = $scope.selectedClinic._id;
            }
            if ($scope.selectedClinic) {
                $scope.selectedinterval = $scope.selectedClinic.appointment_interval
                getConsultants($scope.selectedClinic._id);
            }
        };

        $scope.clinicChanged = function() {
            $scope.clinicData = $scope.selectedClinic;
            if ($scope.selectedClinic) {
                $scope.appointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.appointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.appointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.appointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.appointmentObj.hospital_id = $scope.selectedClinic._id;
                $scope.selectedinterval = $scope.selectedClinic.appointment_interval
                getConsultants($scope.selectedClinic._id);
            }
        }

        $scope.savePatientAppointment = savePatientAppointment

        function savePatientAppointment() {
            if ($scope.patientForm.$valid) {

                // if ($scope.appointmentObj.patient_id != $scope.appointmentObj.doctor_id) {
                if ($scope.appointmentObj.patient.purposeType == "Casualty") {
                    $scope.saveWalkin($scope.appointmentObj);
                } else {
                    var days = $scope.clinicData.general.days;
                    var apptTime = new Date($scope.appointmentObj.appointmentTime);
                    var currTime = new Date();
                    var apptHour = apptTime.getHours();
                    var currHour = currTime.getHours();

                    var today = new Date($scope.appointmentObj.appointmentDetails.appointmentDate);

                    var appointmentDay = today.getDay();
                    var dd = today.getDate();
                    var mm = today.getMonth() + 1; //January is 0!
                    var yyyy = today.getFullYear();

                    if (dd < 10) {
                        dd = '0' + dd
                    }

                    if (mm < 10) {
                        mm = '0' + mm
                    }

                    today = dd + '/' + mm + '/' + yyyy;
                    //Proper date format is not passed for timestamp conversion thats why after 12th August is stop working 
                    var apptDaystimestamp = new Date(yyyy, parseInt(mm) - 1, parseInt(dd)).getTime();

                    var currentToday = new Date();
                    var currentdd = currentToday.getDate();
                    var currentmm = currentToday.getMonth() + 1; //January is 0!
                    var currentyyyy = currentToday.getFullYear();

                    if (currentdd < 10) {
                        currentdd = '0' + currentdd
                    }

                    if (currentmm < 10) {
                        currentmm = '0' + currentmm
                    }

                    currentToday = currentdd + '/' + currentmm + '/' + currentyyyy;
                    var currDaystimestamp = new Date(currentyyyy, parseInt(currentmm) - 1, parseInt(currentdd)).getTime();

                    if (days == "Monday to Friday") {
                        if (appointmentDay == 6 || appointmentDay == 0) {
                            alert("Doctor not available on Saturday & Sunday.")
                        } else {
                            if (apptDaystimestamp >= currDaystimestamp) {
                                if (apptDaystimestamp == currDaystimestamp) {
                                    if (apptHour >= currHour) {
                                        $scope.saveWalkin($scope.appointmentObj);
                                    } else {
                                        alert("Please fill present or future time.")
                                    }
                                } else {
                                    $scope.saveWalkin($scope.appointmentObj);
                                }
                            } else {
                                alert("Please fill current or future dates.")
                            }
                        }
                    } else if (days == "Monday to Saturday") {
                        if (appointmentDay == 0) {
                            alert("Doctor not available on  Sunday.")
                        } else {
                            if (apptDaystimestamp >= currDaystimestamp) {
                                if (apptDaystimestamp == currDaystimestamp) {
                                    if (apptHour >= currHour) {
                                        $scope.saveWalkin($scope.appointmentObj);
                                    } else {
                                        alert("Please fill present or future time.")
                                    }
                                } else {
                                    $scope.saveWalkin($scope.appointmentObj);
                                }
                            } else {
                                alert("Please fill current or future dates.")
                            }
                        }
                    } else {
                        if (apptDaystimestamp >= currDaystimestamp) {
                            if (apptDaystimestamp == currDaystimestamp) {
                                if (apptHour >= currHour) {
                                    $scope.saveWalkin($scope.appointmentObj);
                                } else {
                                    alert("Please fill present or future time.")
                                }
                            } else {
                                $scope.saveWalkin($scope.appointmentObj);
                            }
                        } else {
                            alert("Please fill current or future dates.")
                        }
                    }
                }
            } else {
                alert("Please fill all mandatory data.")
            }
        };

        $scope.saveWalkin = function(data) {
            $scope.appointmentObj = data;
            $scope.appointmentObj.appointmentTime = new Date(moment($scope.appointmentObj.appointmentTime))
            var hoursObj = $scope.appointmentObj.appointmentTime.getHours();
            var dateObj = $scope.appointmentObj.appointmentTime.getDate();
            var monthObj = $scope.appointmentObj.appointmentTime.getMonth() + 1;

            var minutesObj = $scope.appointmentObj.appointmentTime.getMinutes();
            var datenow = new Date($scope.appointmentObj.appointmentDetails.appointmentDate);
            $scope.appointmentObj.appointmentTime.setFullYear(datenow.getFullYear())
            $scope.appointmentObj.appointmentTime.setMonth(datenow.getMonth())
            $scope.appointmentObj.appointmentTime.setDate(datenow.getDate())
            var startTime = moment($scope.appointmentObj.appointmentTime);
            var endTime = moment($scope.appointmentObj.appointmentTime)
            switch ($scope.selectedinterval) {
                case '02:00:00':
                    endTime = endTime.add(2, 'h')
                    break;
                case '00:30:00':
                    endTime = endTime.add(30, 'm')
                    break;
                case '00:15:00':
                    endTime = endTime.add(15, 'm')
                    break;
                case '00:10:00':
                    endTime = endTime.add(10, 'm')
                    break;
                case '00:05:00':
                    endTime = endTime.add(5, 'm')
                    break;
                default:
                    endTime = endTime.add(5, 'm')
                    break;
            }

            $scope.appointmentObj.startTime = startTime;
            $scope.appointmentObj.endTime = endTime;

            var proxy = {
                isProxy: '0'
            };

            if (userProxy) {
                proxy.isProxy = '1'
                proxy.proxyId = userProxy.proxyForUser
                proxy.proxyFor = "Write Appointment"
            }

            var obj = {
                clinicId: $scope.appointmentObj.hospital_id,
                appointmentInterval: startTime,
                appointmentDay: $scope.appointmentObj.appointmentDetails.appointmentDate,
                doctorId: $scope.appointmentObj.appointmentDetails.consultant,
                proxy: proxy
            }

            if ($scope.appointmentObj.patient.purposeType == 'Casualty') {
                if (!$scope.appointmentObj.patient_id) {
                    temporaryUserRegistrationAPI($scope.appointmentObj.patient, function(err, patientResp) {
                        if (err) {
                            alert(err);
                        } else {
                            $scope.appointmentObj.patient_id = patientResp._id;
                            addAppointmentAPI($scope.appointmentObj, function(err, resp) {
                                if (err) {
                                    alert(err);
                                } else {
                                    $state.reload();
                                }
                            });
                        }
                    });
                } else {
                    addAppointmentAPI($scope.appointmentObj, function(err, resp) {
                        if (err) {
                            alert(err);
                        } else {
                            $state.reload();
                        }
                    });
                }
            } else {
                if (!$scope.appointmentObj.patient_id) {
                    temporaryUserRegistrationAPI($scope.appointmentObj.patient, function(err, patientResp) {
                        if (err) {
                            alert(err);
                        } else {
                            $scope.appointmentObj.patient_id = patientResp._id;
                            addAppointmentAPI($scope.appointmentObj, function(err, resp) {
                                if (err) {
                                    alert(err);
                                } else {
                                    $state.reload();
                                }
                            });
                        }
                    });
                } else {
                    addAppointmentAPI($scope.appointmentObj, function(err, resp) {
                        if (err) {
                            alert(err);
                        } else {
                            $state.reload();
                        }
                    });
                }
            }
        }

        $scope.onPatientSelect = onPatientSelect

        function onPatientSelect(item) {
            $scope.appointmentObj.patient.dueamount = undefined;
            $scope.appointmentObj.patient.extrapaidamt = undefined;
            $scope.patientSelected = true;
            $scope.appointmentObj.patient.name = item.first_name + ' ' + item.last_name;
            $scope.appointmentObj.patient.age = item.age;
            $scope.appointmentObj.patient.gender = item.gender.toLowerCase();
            $scope.appointmentObj.patient.contactNumber = parseInt(item.mobile);
            $scope.appointmentObj.patient.email = cleanEmailAddress(item.email);
            $scope.appointmentObj.patient_id = item._id;
            $scope.appointmentObj.patient.profilePic = item.profile_img;
            for (var i in item.clinicsaccount) {
                //Add this condition  && item.clinicsaccount[i].doctor_id == $scope.appointmentObj.appointmentDetails.consultant if you want to make it for Doctor as well
                if (item.clinicsaccount[i].clinic_id == $scope.selectedClinic._id) {
                    if (item.clinicsaccount[i].dueamount == 0) {
                        $scope.appointmentObj.patient.dueamount = 0;
                        $scope.appointmentObj.patient.extrapaidamt = item.clinicsaccount[i].extrapaidamt;
                    } else {
                        $scope.appointmentObj.patient.dueamount = item.clinicsaccount[i].dueamount;
                        $scope.appointmentObj.patient.extrapaidamt = 0;
                    }
                }
            }
            if ($scope.appointmentObj.patient.dueamount === undefined) {
                $scope.appointmentObj.patient.dueamount = undefined;
                $scope.appointmentObj.patient.extrapaidamt = undefined;
            }
            console.log($scope.appointmentObj.patient.dueamount);
            console.log($scope.appointmentObj.patient.extrapaidamt);
            //$scope.appointmentObj.patient.lastcharge = item.clinicsaccount[item.visits.length - 1].charges;

            $scope.appointmentObj.patient.patientType = "Old";

            var blackFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Black_Flagged == 'Y'
            })
            if (blackFlagIndex > -1) {
                $scope.isBlackFlagged = true;
            }

            var redFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Red_Flagged == 'Y'
            })
            if (redFlagIndex > -1) {
                $scope.isRedFlagged = true
            }
        };

        $scope.onMRPatientSelect = function(item) {
            // mrAppointmentObj
            $scope.patientSelected = true;
            $scope.mrAppointmentObj.patient.name = item.first_name + ' ' + item.last_name;
            $scope.mrAppointmentObj.patient.age = item.age;
            $scope.mrAppointmentObj.patient.gender = item.gender.toLowerCase();
            $scope.mrAppointmentObj.patient.contactNumber = parseInt(item.mobile);
            $scope.mrAppointmentObj.patient.email = cleanEmailAddress(item.email);
            $scope.mrAppointmentObj.patient_id = item._id;
            $scope.mrAppointmentObj.patient.profilePic = item.profile_img

            $scope.mrAppointmentObj.patient.patientType = "Old";

            var blackFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Black_Flagged == 'Y'
            })
            if (blackFlagIndex > -1) {
                $scope.isBlackFlagged = true;
            }

            var redFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Red_Flagged == 'Y'
            })
            if (redFlagIndex > -1) {
                $scope.isRedFlagged = true
            }
        };

        function addAppointmentAPI(appointmentObj, _cb) {
            var proxy = {
                isProxy: '0'
            };

            if (userProxy) {
                proxy.isProxy = '1'
                proxy.proxyId = userProxy.proxyForUser
                proxy.proxyFor = "Write Appointment"

                $scope.appointmentObj.doctor_id = userProxy.proxyForUser
            }

            appointmentObj.doctor_id = $scope.appointmentObj.appointmentDetails.consultant

            var finalData = {
                appointment: appointmentObj,
                proxy: proxy
            }

            authorizedDataSourceService
                .post('/api/calendar/addAppointment', finalData)
                .then((response) => {
                    console.log("response " + JSON.stringify(response))
                    if (response.status === 'ok') {
                        _cb(null, 'ok')
                    } else {
                        _cb('apppointment not generated', null)
                    }
                }).catch(function(error) {
                    _cb('apppointment not generated', null)
                });
        };

        function temporaryUserRegistrationAPI(patient, _cb) {
            authorizedDataSourceService
                .post('/api/user/temporary-registration', patient)
                .then((response) => {
                    if (response.status === 'ok') {
                        _cb(null, response.data);
                    } else {
                        _cb(response.reason, null);
                    }
                }).catch(function(error) {
                    _cb('Could not register patient', null);
                });
        };

        function temporaryUserRegistrationAPI(patient, _cb) {
            authorizedDataSourceService
                .post('/api/user/temporary-registration', patient)
                .then((response) => {
                    if (response.status === 'ok') {
                        _cb(null, response.data);
                    } else {
                        _cb(response.reason, null);
                    }
                }).catch(function(error) {
                    _cb('Could not register patient', null);
                });
        };
        $scope.getDoctorList = function(key) {
            var doctorSearch = {
                searchParams: key
            };
            return authorizedDataSourceService.get('/api/user/getDoctors/by-name', doctorSearch)
                .then(function(response) {
                    if (response.status == "ok") {
                        return response.data.map((item) => {
                            return item;
                        });
                    } else {
                        $scope.flashMessage = "Patient not available";
                    }
                })
                .catch(function(err) {
                    console.log('Update failed: ', err);
                    $scope.flashMessage = err;
                });
        };
        $scope.onDoctorSelect = function(item) {
            $scope.appointmentObj.patient.referredBy.name = item.first_name + ' ' + item.last_name;
            $scope.appointmentObj.patient.referredBy.doctor_id = item._id;
        };

        $scope.getConsultants = getConsultants

        function getConsultants(clinicId) {
            authorizedDataSourceService.post('/api/doctor/get-consultants-from-clinics', {
                    clinicId: clinicId
                })
                .then(function(response) {
                    if (response.status == "ok") {
                        $scope.consultantListInClinic = response.data;
                        if (clinicData) {
                            if (clinicData.consultant) {
                                if ($scope.appointmentObj.appointmentDetails) {
                                    $scope.appointmentObj.appointmentDetails.consultant = clinicData.consultant._id
                                } else {
                                    $scope.appointmentObj.appointmentDetails = {};
                                    $scope.appointmentObj.appointmentDetails.consultant = clinicData.consultant._id
                                }
                            } else {
                                $scope.appointmentObj.appointmentDetails.consultant = user._id;
                            }
                        } else {
                            $scope.appointmentObj.appointmentDetails.consultant = user._id;
                        }

                        getConsultantTime()
                    } else {
                        console.log('response: ', response.reason);
                        $scope.consultantListInClinic = [];
                    }
                })
                .catch(function(err) {
                    console.log('Update failed: ', err);
                    $scope.consultantListInClinic = [];
                });
        }

        $scope.getSisters = getSisters;

        function getSisters() {
            authorizedDataSourceService.get('/api/user/get-all-sisters-details')
                .then(function(response) {
                    if (response.status == "ok") {
                        console.log("response " + JSON.stringify(response.data))
                        $scope.allSistersData = response.data;
                    } else {
                        console.log('response: ', response.reason);
                    }
                })
                .catch(function(err) {
                    console.log('Update failed: ', err);
                });
        }

        getSisters();

        $scope.uploadReport = uploadReport

        function uploadReport(file) {
            var options = {
                file: file,
                onResponse: function(resp) {
                    console.log(resp);
                    $scope.appointmentObj.appointmentDetails.reportUrl = resp;
                },
                onError: function(err) {
                    console.log(err);
                }
            }
            S3DirectUploaderService.uploadFile(options);
        }

        $scope.uploadProfilePic = uploadProfilePic

        function uploadProfilePic(file) {
            var options = {
                file: file,
                onResponse: function(resp) {
                    // console.log(resp);
                    $scope.appointmentObj.patient.profilePic = resp;
                    $scope.visitorAppointmentObj.patient.profilePic = resp;
                    $scope.mrAppointmentObj.patient.profilePic = resp;
                },
                onError: function(err) {
                    console.log(err);
                }
            }
            S3DirectUploaderService.uploadFile(options);
        }

        $scope.saveMRAppointment = saveMRAppointment

        function saveMRAppointment() {
            if ($scope.mrForm.$valid) {
                $scope.mrAppointmentObj.appointmentTime = new Date(moment($scope.mrAppointmentObj.appointmentTime))
                var hoursObj = $scope.mrAppointmentObj.appointmentTime.getHours();
                var minutesObj = $scope.mrAppointmentObj.appointmentTime.getMinutes();
                var datenow = new Date($scope.mrAppointmentObj.appointmentDetails.appointmentDate);
                $scope.mrAppointmentObj.appointmentTime.setFullYear(datenow.getFullYear())
                $scope.mrAppointmentObj.appointmentTime.setMonth(datenow.getMonth())
                $scope.mrAppointmentObj.appointmentTime.setDate(datenow.getDate())
                var startTime = moment($scope.mrAppointmentObj.appointmentTime);
                var endTime = moment($scope.mrAppointmentObj.appointmentTime)
                switch ($scope.selectedinterval) {
                    case '02:00:00':
                        endTime = endTime.add(2, 'h')
                        break;
                    case '00:30:00':
                        endTime = endTime.add(30, 'm')
                        break;
                    case '00:15:00':
                        endTime = endTime.add(15, 'm')
                        break;
                    case '00:10:00':
                        endTime = endTime.add(10, 'm')
                        break;
                    case '00:05:00':
                        endTime = endTime.add(5, 'm')
                        break;
                    default:
                        endTime = endTime.add(5, 'm')
                        break;
                }

                $scope.mrAppointmentObj.startTime = startTime;
                $scope.mrAppointmentObj.endTime = endTime;

                var proxy = {
                    isProxy: '0'
                };

                if (userProxy) {
                    proxy.isProxy = '1'
                    proxy.proxyId = userProxy.proxyForUser
                    proxy.proxyFor = "Write Appointment"
                }

                var obj = {
                    clinicId: $scope.mrAppointmentObj.hospital_id,
                    appointmentInterval: startTime,
                    appointmentDay: $scope.mrAppointmentObj.appointmentDetails.appointmentDate,
                    doctorId: $scope.mrAppointmentObj.appointmentDetails.consultant,
                    proxy: proxy
                }

                $scope.mrAppointmentObj.appointmentDetails.appointmentFor = 'Medical Rep'

                if (!$scope.mrAppointmentObj.patient_id) {
                    temporaryUserRegistrationAPI($scope.mrAppointmentObj.patient, function(err, patientResp) {
                        if (err) {
                            alert(err);
                        } else {
                            $scope.mrAppointmentObj.patient_id = patientResp._id;
                            addAppointmentAPI($scope.mrAppointmentObj, function(err, resp) {
                                if (err) {
                                    alert(err);
                                } else {
                                    $state.reload();
                                }
                            });
                        }
                    });
                } else {
                    addAppointmentAPI($scope.mrAppointmentObj, function(err, resp) {
                        if (err) {
                            alert(err);
                        } else {
                            $state.reload();
                        }
                    });
                }
            } else {
                alert("Please fill all mandatory data.")
            }
        }

        $scope.getConsultantTime = getConsultantTime

        function getConsultantTime() {

            authorizedDataSourceService.post('/api/calendar/listDoctorsTimeSlots', {
                    clinicId: $scope.selectedClinic._id,
                    doctorId: $scope.appointmentObj.appointmentDetails.consultant
                })
                .then(function(response) {
                    if (response.status == "ok") {
                        $scope.morningSlots = []
                        $scope.eveningSlots = []


                        response.data.morningSlots.forEach(function(time) {
                            $scope.morningSlots.push({
                                label: getFormattedDate(time),
                                value: moment(time)
                            })
                        });

                        response.data.eveningSlots.forEach(function(time) {
                            $scope.eveningSlots.push({
                                label: getFormattedDate(time),
                                value: moment(time)
                            })
                        });
                    }
                })
                .catch(function(err) {
                    console.log('Update failed: ', err);
                });
        }

        $scope.cleanEmailAddress = cleanEmailAddress

        function cleanEmailAddress(email) {
            return commonUtilsService.cleanEmailAddr(email);
        }

        //Visitor Functions Start
        $scope.onVisitorSelect = onVisitorSelect

        function onVisitorSelect(item) {
            $scope.patientSelected = true;
            $scope.visitorAppointmentObj.patient.name = item.first_name + ' ' + item.last_name;
            $scope.visitorAppointmentObj.patient.age = item.age;
            $scope.visitorAppointmentObj.patient.gender = item.gender.toLowerCase();
            $scope.visitorAppointmentObj.patient.contactNumber = parseInt(item.mobile);
            $scope.visitorAppointmentObj.patient.email = cleanEmailAddress(item.email);
            $scope.visitorAppointmentObj.patient_id = item._id;
            $scope.visitorAppointmentObj.patient.profilePic = item.profile_img

            $scope.visitorAppointmentObj.patient.patientType = "Old";

            var blackFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Black_Flagged == 'Y'
            })
            if (blackFlagIndex > -1) {
                $scope.isBlackFlagged = true;
            }

            var redFlagIndex = item.ratings.findIndex(function(o) {
                return o.is_Red_Flagged == 'Y'
            })
            if (redFlagIndex > -1) {
                $scope.isRedFlagged = true
            }
        }

        $scope.saveVisitorAppointment = saveVisitorAppointment

        function saveVisitorAppointment() {
            if ($scope.visitorForm.$valid) {
                $scope.visitorAppointmentObj.appointmentTime = new Date(moment($scope.visitorAppointmentObj.appointmentTime))
                var hoursObj = $scope.visitorAppointmentObj.appointmentTime.getHours();
                var minutesObj = $scope.visitorAppointmentObj.appointmentTime.getMinutes();
                var datenow = new Date($scope.visitorAppointmentObj.appointmentDetails.appointmentDate);
                $scope.visitorAppointmentObj.appointmentTime.setFullYear(datenow.getFullYear())
                $scope.visitorAppointmentObj.appointmentTime.setMonth(datenow.getMonth())
                $scope.visitorAppointmentObj.appointmentTime.setDate(datenow.getDate())
                var startTime = moment($scope.visitorAppointmentObj.appointmentTime);
                var endTime = moment($scope.visitorAppointmentObj.appointmentTime)
                switch ($scope.selectedinterval) {
                    case '02:00:00':
                        endTime = endTime.add(2, 'h')
                        break;
                    case '00:30:00':
                        endTime = endTime.add(30, 'm')
                        break;
                    case '00:15:00':
                        endTime = endTime.add(15, 'm')
                        break;
                    case '00:10:00':
                        endTime = endTime.add(10, 'm')
                        break;
                    case '00:05:00':
                        endTime = endTime.add(5, 'm')
                        break;
                    default:
                        endTime = endTime.add(5, 'm')
                        break;
                }

                $scope.visitorAppointmentObj.startTime = startTime;
                $scope.visitorAppointmentObj.endTime = endTime;

                var proxy = {
                    isProxy: '0'
                };

                if (userProxy) {
                    proxy.isProxy = '1'
                    proxy.proxyId = userProxy.proxyForUser
                    proxy.proxyFor = "Write Appointment"
                }

                var obj = {
                    clinicId: $scope.visitorAppointmentObj.hospital_id,
                    appointmentInterval: startTime,
                    appointmentDay: $scope.visitorAppointmentObj.appointmentDetails.appointmentDate,
                    doctorId: $scope.visitorAppointmentObj.appointmentDetails.consultant,
                    proxy: proxy
                }

                $scope.visitorAppointmentObj.appointmentDetails.appointmentFor = 'Visitor'

                if (!$scope.visitorAppointmentObj.patient_id) {
                    temporaryUserRegistrationAPI($scope.visitorAppointmentObj.patient, function(err, patientResp) {
                        if (err) {
                            alert(err);
                        } else {
                            $scope.visitorAppointmentObj.patient_id = patientResp._id;
                            addAppointmentAPI($scope.visitorAppointmentObj, function(err, resp) {
                                if (err) {
                                    alert(err);
                                } else {
                                    $state.reload();
                                }
                            });
                        }
                    });
                } else {
                    addAppointmentAPI($scope.visitorAppointmentObj, function(err, resp) {
                        if (err) {
                            alert(err);
                        } else {
                            $state.reload();
                        }
                    });
                }
            } else {
                alert("Please fill all mandatory data.")
            }
        };

        $scope.clinicVisitorChanged = function() {
            if ($scope.selectedClinic) {
                $scope.visitorAppointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.visitorAppointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.visitorAppointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.visitorAppointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.visitorAppointmentObj.hospital_id = $scope.selectedClinic._id;
                $scope.selectedinterval = $scope.selectedClinic.appointment_interval
                getVisitorConsultants($scope.selectedClinic._id);
            }
        }

        // $scope.getVisitorConsultants = getVisitorConsultants

        // function getVisitorConsultants(clinicId) {
        //     // console.log("clinicId = " + clinicId)
        //     authorizedDataSourceService.post('/api/doctor/get-consultants-from-clinics', {
        //             clinicId: clinicId
        //         })
        //         .then(function (response) {
        //             if (response.status == "ok") {
        //                 $scope.consultantListInClinic = response.data;
        //                 if (clinicData) {
        //                     if (clinicData.consultant) {
        //                         if ($scope.visitorAppointmentObj.appointmentDetails) {
        //                             $scope.visitorAppointmentObj.appointmentDetails.consultant = clinicData.consultant._id
        //                         } else {
        //                             $scope.visitorAppointmentObj.appointmentDetails = {};
        //                             $scope.visitorAppointmentObj.appointmentDetails.consultant = clinicData.consultant._id
        //                         }
        //                     } else {
        //                         $scope.visitorAppointmentObj.appointmentDetails.consultant = user._id;
        //                     }
        //                 } else {
        //                     $scope.visitorAppointmentObj.appointmentDetails.consultant = user._id;
        //                 }

        //                 getVisitorConsultantTime()
        //             } else {
        //                 console.log('response: ', response.reason);
        //                 $scope.consultantListInClinic = [];
        //             }
        //         })
        //         .catch(function (err) {
        //             console.log('Update failed: ', err);
        //             $scope.consultantListInClinic = [];
        //         });
        // }

        // $scope.getVisitorConsultantTime = getVisitorConsultantTime

        // function getVisitorConsultantTime() {
        //     authorizedDataSourceService.post('/api/calendar/listDoctorsTimeSlots', {
        //             clinicId: $scope.selectedClinic._id,
        //             doctorId: $scope.visitorAppointmentObj.appointmentDetails.consultant
        //         })
        //         .then(function (response) {
        //             if (response.status == "ok") {
        //                 // console.log("Timeslots = " + JSON.stringify(response.data))
        //                 $scope.morningSlots = []
        //                 $scope.eveningSlots = []

        //                 response.data.morningSlots.forEach(function (time) {
        //                     $scope.morningSlots.push({
        //                         label: getFormattedDate(time),
        //                         value: moment(time)
        //                     })
        //                 });

        //                 response.data.eveningSlots.forEach(function (time) {
        //                     $scope.eveningSlots.push({
        //                         label: getFormattedDate(time),
        //                         value: moment(time)
        //                     })
        //                 });

        //             }
        //         })
        //         .catch(function (err) {
        //             console.log('Update failed: ', err);
        //         });
        // }

        //Visitor Functions Start

        $scope.clinicMRChanged = function() {
            if ($scope.selectedClinic) {
                $scope.mrAppointmentObj.patient.addrFirstLine = $scope.selectedClinic.general.address.address_line_one + ', ' +
                    $scope.selectedClinic.general.address.address_line_two + ', ' +
                    $scope.selectedClinic.general.address.address_line_three + ', ' +
                    $scope.selectedClinic.general.address.city + ', ' +
                    $scope.selectedClinic.general.address.state + ', ' +
                    $scope.selectedClinic.general.address.pin_code;
                $scope.mrAppointmentObj.patient.city = $scope.selectedClinic.general.address.city;
                $scope.mrAppointmentObj.patient.state = $scope.selectedClinic.general.address.state;
                $scope.mrAppointmentObj.patient.clinic_name = $scope.selectedClinic.general.name;
                $scope.mrAppointmentObj.hospital_id = $scope.selectedClinic._id;
                $scope.selectedinterval = $scope.selectedClinic.appointment_interval
                getMRConsultants($scope.selectedClinic._id);
            }
        }

        // $scope.getMRConsultants = getMRConsultants

        // function getMRConsultants(clinicId) {
        //     // console.log("clinicId = " + clinicId)
        //     authorizedDataSourceService.post('/api/doctor/get-consultants-from-clinics', {
        //             clinicId: clinicId
        //         })
        //         .then(function (response) {
        //             if (response.status == "ok") {
        //                 $scope.consultantListInClinic = response.data;
        //                 if (clinicData) {
        //                     if (clinicData.consultant) {
        //                         if ($scope.mrAppointmentObj.appointmentDetails) {
        //                             $scope.mrAppointmentObj.appointmentDetails.consultant = clinicData.consultant._id
        //                         } else {
        //                             $scope.mrAppointmentObj.appointmentDetails = {};
        //                             $scope.mrAppointmentObj.appointmentDetails.consultant = clinicData.consultant._id
        //                         }
        //                     } else {
        //                         $scope.mrAppointmentObj.appointmentDetails.consultant = user._id;
        //                     }
        //                 } else {
        //                     $scope.mrAppointmentObj.appointmentDetails.consultant = user._id;
        //                 }

        //                 getMRConsultantTime()
        //             } else {
        //                 console.log('response: ', response.reason);
        //                 $scope.consultantListInClinic = [];
        //             }
        //         })
        //         .catch(function (err) {
        //             console.log('Update failed: ', err);
        //             $scope.consultantListInClinic = [];
        //         });
        // }

        // $scope.getMRConsultantTime = getMRConsultantTime

        // function getMRConsultantTime() {
        //     authorizedDataSourceService.post('/api/calendar/listDoctorsTimeSlots', {
        //             clinicId: $scope.selectedClinic._id,
        //             doctorId: $scope.mrAppointmentObj.appointmentDetails.consultant
        //         })
        //         .then(function (response) {
        //             if (response.status == "ok") {
        //                 console.log("Timeslots = " + JSON.stringify(response.data))
        //                 $scope.morningSlots = []
        //                 $scope.eveningSlots = []

        //                 response.data.morningSlots.forEach(function (time) {
        //                     $scope.morningSlots.push({
        //                         label: getFormattedDate(time),
        //                         value: moment(time)
        //                     })
        //                 });

        //                 response.data.eveningSlots.forEach(function (time) {
        //                     $scope.eveningSlots.push({
        //                         label: getFormattedDate(time),
        //                         value: moment(time)
        //                     })
        //                 });

        //             }
        //         })
        //         .catch(function (err) {
        //             console.log('Update failed: ', err);
        //         });
        // }



        // $scope.channel = {};
        // $scope.renderImage = null;
        // $scope.webcamError = false;
        // $scope.marginTop = false;
        // var _video = null;
        // var patData = null;
        // $scope.patOpts = {
        //     x: 0,
        //     y: 0,
        //     w: 25,
        //     h: 25
        // };
        // var newFile;

        // $scope.file_changed = function(element) {
        //     $scope.$broadcast('$destroy');
        //     $scope.$broadcast('STOP_WEBCAM');
        //     $scope.marginTop = false;
        //     newFile = new FileReader();
        //     newFile.readAsDataURL(element.files[0]); // convert the image to data url. 
        //     newFile.onload = function(e) {
        //         $scope.renderImage = e.target.result;
        //         $scope.image_obj.img_placeholder = false;
        //         $scope.image_obj.video_capture = false;
        //         $scope.image_obj.video = false;
        //         $scope.image_obj.image = true;
        //         // $scope.checkElemInput();
        //         $scope.$apply();
        //     }
        // };

        // $scope.onError = function(err) {
        //     $scope.$apply(function() {
        //         $scope.webcamError = err;
        //     });
        // };

        // $scope.onSuccess = function() {
        //     // The video element contains the captured camera data
        //     _video = $scope.channel.video;
        //     $scope.$apply(function() {
        //         $scope.patOpts.w = _video.width;
        //         $scope.patOpts.h = _video.height;
        //     });
        // };

        // var getVideoData = function getVideoData(x, y, w, h) {
        //     var hiddenCanvas = document.createElement('canvas');
        //     hiddenCanvas.width = _video.width;
        //     hiddenCanvas.height = _video.height;
        //     var ctx = hiddenCanvas.getContext('2d');
        //     ctx.drawImage(_video, 0, 0, _video.width, _video.height);
        //     return ctx.getImageData(x, y, w, h);
        // };

        // $scope.onStream = function(stream) {};
        // $scope.makeSnapshot = function() {
        //     if (_video) {
        //         newFile = new FileReader();
        //         $scope.uploadFile = null;
        //         var patCanvas = document.querySelector('#snapshot');
        //         if (!patCanvas) return;
        //         patCanvas.width = _video.width;
        //         patCanvas.height = _video.height;
        //         var ctxPat = patCanvas.getContext('2d');
        //         var idata = getVideoData($scope.patOpts.x, $scope.patOpts.y, $scope.patOpts.w, $scope.patOpts.h);
        //         ctxPat.putImageData(idata, 0, 0);
        //         $scope.snapshotData = patCanvas.toDataURL();
        //         $scope.image_obj.video_holder = false;
        //         $scope.marginTop = true;
        //         $scope.image_obj.image = true;
        //         $scope.image_obj.video = false;
        //         $scope.renderImage = $scope.snapshotData;
        //         console.log("$scope.renderImage = " + $scope.renderImage)
        //         convertImage();
        //         // document.getElementById('docsmart-image-container').style.paddingTop = '28px';
        //         // $scope.checkElemInput();
        //         patData = idata;
        //     }
        // };
        // $scope.image_obj = {
        //     img_placeholder: true,
        //     image: false,
        //     video: false,
        //     video_capture: false
        // }
        // $scope.snap_image = function() {
        //     // angular.element("input[type='file']").val(null);
        //     $scope.image_obj.img_placeholder = false;
        //     $scope.image_obj.image = false;
        //     $scope.image_obj.video_capture = false;
        //     $scope.image_obj.video = true;
        // }

        // $scope.convertImage = convertImage

        // function convertImage() {
        //     // string generated by canvas.toDataURL()
        //     var img = $scope.renderImage;
        //     // Grab the extension to resolve any image error
        //     var ext = img.split(';')[0].match(/jpeg|png|gif/)[0];
        //     // strip off the data: url prefix to get just the base64-encoded bytes
        //     var data = img.replace(/^data:image\/\w+;base64,/, "");
        //     var buf = new Buffer(img, 'base64');
        //     var file;
        //     file = new File(buf, '/Users/admin/docsmart/app/vineet.jpg');
        //     document.location = $scope.renderImage
        //         // file.writeFile('image.' + ext, buf);
        // }

        $scope.downloadFingerprintFile = downloadFingerprintFile

        function downloadFingerprintFile() {
            $http({
                    method: 'GET',
                    url: '/api/downloadFingerprintFile',
                    responseType: 'arraybuffer'
                }).then(function(data, status, headers) {

                    var linkElement = document.createElement('a');
                    try {
                        var blob = new Blob([data.data], {
                            type: 'application/zip'
                        });
                        var url = window.URL.createObjectURL(blob);

                        linkElement.setAttribute('href', url);
                        linkElement.setAttribute("download", 'FingerPrintApplication.zip');

                        var clickEvent = new MouseEvent("click", {
                            "view": window,
                            "bubbles": true,
                            "cancelable": false
                        });
                        linkElement.dispatchEvent(clickEvent);
                    } catch (ex) {
                        console.log(ex);
                    }
                })
                .catch(function(obj, err) {
                    console.log("err = " + JSON.stringify(err))
                });
        }
    }
};

export const addWalkInModal = {
    controller: AddWalkInController,
    templateUrl: "./online-consultation/add-walk-in-modal.html"
};