const express = require("express");
require("dotenv").config();
//
const AppointmentService = require("../services/appointments.service.js");
const {
  validateHour12,
  validateDate,
} = require("../middlewares/validateTime.js");
const { validatePlate } = require("../middlewares/validatePlate.js");
const {
  getByDate,
  getAbilitySchema,
  createAppointmentSchema,
  getByQuery,
  patchAppointmentParams,
  patchAppointment,
  patchAppointmentState,
} = require("../schemas/appointments.schema.js");
const { validatorHandler } = require("../middlewares/validator.handler.js");
const { checkUser, checkLaundry } = require("../middlewares/auth.handler.js");
const {
  authRequiredClient,
  authRequiredUser,
} = require("../middlewares/validateToken.js");

const appointment = new AppointmentService();
const appointmentRouter = express.Router();

appointmentRouter.post(
  "/create-appointment",
  authRequiredUser,
  checkUser,
  validatorHandler(createAppointmentSchema, "body"),
  async (req, res) => {
    try {
      const user = req.user.id;
      const body = req.body;
      const dateValidated = validateDate(body.date);
      if (!dateValidated)
        return res.status(404).json({
          message:
            "error en el formato de fecha por favor ingrese una fecha valida o proxima fecha a partir de la fecha actual ",
        });
      body.date = dateValidated;
      const hourFomatted = validateHour12(body.time);
      if (!hourFomatted)
        return res.status(404).json({
          message:
            "error en el formato de hora por favor ingrese una hora valida ",
        });
      body.time = hourFomatted;
      const rta = await appointment.saveAppointment(body, user);
      res.status(201).json({ message: "Registro de cita exitoso ", rta });
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

//traer  citas del usuario
appointmentRouter.get(
  "/my-appointments",
  authRequiredUser,
  checkUser,
  async (req, res) => {
    try {
      // const date = validador();
      const userId = req.user.id;
      const myappointments = await appointment.findMyAppointments(userId);
      // const rt = await appointment.getCitas(date);

      // console.log(formattedResult);

      // const dt = rt.date;
      // const time = rt.time;
      // const Vehicle = rt.Vehicle.plate;
      // const useremail = rt.Vehicle.User.email;
      // console.log(dt, time, Vehicle, useremail);
      res.status(200).json(myappointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

//traer citas del lavadero
appointmentRouter.get(
  "/get-appointments/:date",
  authRequiredClient,
  checkLaundry,
  validatorHandler(getByDate, "params"),
  validatorHandler(getByQuery, "query"),
  async (req, res) => {
    try {
      const query = req.query;
      const { date } = req.params;
      const id = req.user.id;
      const rta = validateDate(date);
      if (!rta)
        return res.status(404).json({
          message:
            "error en el formato de fecha por favor ingrese una fecha valida o proxima fecha a partir de la fecha actual ",
        });
      const findAppointments = await appointment.findAllAppointments(
        id,
        date,
        query
      );
      res.status(201).json(findAppointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

// filtrar por fecha o placa para buscar
appointmentRouter.get(
  "/get-appointments-absence/",
  authRequiredClient,
  checkLaundry,
  validatorHandler(getByQuery, "query"),
  async (req, res) => {
    try {
      const query = req.query;
      const id = req.user.id;
      const { plate } = query;

      if (plate) {
        const validate = await validatePlate(plate);
        if (!validate) {
          return res.status(404).json({
            message: "error en la placa, ingrese una placa valida ",
          });
        }
      }
      console.log(query);
      const findAppointments = await appointment.findAllAppointmentsAbsence(
        id,
        query
      );
      res.status(201).json(findAppointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

// appointmentRouter.patch(
//   "/get-vehicle",
//   validatorHandler(getVehivleSchema, "params"),
//   validatorHandler(updateVehicleShema, "body"),
//   async (req, res) => {
//     try {
//       const body = req.body;
//       const rta = await appointment.findByPlate(body.plate);
//       res.status(201).json({ message: "vehiculo ", rta });
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({ message: error.message });
//     }
//     (err, res) => {
//       res.status(400).json({ error: err.message });
//     };
//   }
// );

//para traer la disponibilidad de horas segun el lavadero es get al seleccionar la fecha
appointmentRouter.get(
  "/:id/:date",
  authRequiredUser,
  checkUser,
  validatorHandler(getAbilitySchema, "params"),
  async (req, res) => {
    try {
      const { id, date } = req.params;
      validateDate(date);
      if (!validateDate)
        return res.status(404).json({
          message:
            "error en el formato de fecha por favor ingrese una fecha valida o proxima fecha a partir de la fecha actual ",
        });
      const appointments = await appointment.findAbilityByService(id, date);
      res.status(200).json(appointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

// ruta para actualizar el estado de la cita que se haya asistido
appointmentRouter.patch(
  "/my-appointments/:id",
  authRequiredClient,
  // checkUser,
  validatorHandler(patchAppointmentParams, "params"),
  validatorHandler(patchAppointmentState, "body"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const body = req.body;
      const updateMyppointmentsState =
        await appointment.updateMyAppointmentState(id, userId, body);
      res.status(201).json(updateMyppointmentsState);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);

appointmentRouter.patch(
  "/my-appointments/:id",
  authRequiredClient,
  checkUser,
  validatorHandler(patchAppointmentParams, "params"),
  validatorHandler(patchAppointment, "body"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const body = req.body;
      const updateMyppointments = await appointment.updateMyAppointment(
        userId,
        id,
        body
      );
      res.status(200).json(updateMyppointments);
    } catch (error) {
      console.error(error);
      return res.status(500).json([error.message]);
    }
    (err, res) => {
      res.status(400).json({ error: err.message });
    };
  }
);
module.exports = appointmentRouter;
