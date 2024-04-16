const { spic, spicMeta } = require("../models/S2");
const _ = require("lodash");
const moment = require("moment-timezone");
require("dotenv").config();
const {
  proveedorRegistros,
} = require("../../proveedor/models/proveedorRegistros");
const { User } = require("../../usuario/models/User");
//const { error } = require("../../../backend/src/server/schemas/S2V2/model.joynew.s2");
// funciones y datos para utilizar las validaciones con ajv y json
const Ajv = require("ajv");
const SwaggerParser = require("swagger-parser");
const { SchemaEnv } = require("ajv/dist/compile");
const { schemaS2 } = require("../models/S2AJV.js");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId; // Obtén la clase ObjectId de Mongoose


module.exports = {
  validar: async (req, res) => {
    let data = req.body;
    let ajv = new Ajv({ allErrors: true, strict: false });
    // Adjust path if needed
    let validate = ajv.compile(data);
    let valid = validate(req.body);

    if (!valid) {
      const errorMessages = validate.errors
        .map((error) => error.message)
        .join("\n");
      console.error("Validation failed:", errorMessages); // Use console.error for errors
      // Handle errors appropriately (e.g., return a 400 Bad Request response)
      return res
        .status(500)
        .json({
          message: "Datos no valdios para crear el usuario.",
          error: error.message,
        });
    } else {
      console.log("Validation successful!");
      console.log("Validation successful!");
      res.status(200).json({
        status: true,
        message:
          "Otro endpoint del s2 está para insertar está funcionando correctamente!",
      });
    }
  },
  insertS2v2: async (req, res) => {
    try {
      //obtenemos valores del req
      let usuario = req.body.usuario;
      delete req.body.usuario;
      let newdocument = req.body;
      //console.log(newdocument);
      //let data = req.body;
      let ajv = new Ajv({ allErrors: true, strict: false });
      // Adjust path if needed
      let validate = ajv.compile(schemaS2);
      let valid = validate(newdocument);

      if (!valid) {
        const errorMessages = validate.errors
          .map((error) => error.message)
          .join("\n");
        //console.error("Validation failed:", errorMessages); // Use console.error for errors
        // Handle errors appropriately (e.g., return a 400 Bad Request response)
        const validationErrors = validate.errors;
        if (validationErrors) {
          console.error("Errores de validación:", validationErrors);
        }

        return res
          .status(500)
          .json({
            message: "Datos no valdios para crear el usuario.",
            error: error.message,
          });

      } else {
        /* Inicio de la fucnion insertar en la coleccion */
        let fecha = moment().tz("America/Mexico_City").format();
        //console.log(fecha);
        newdocument["fechaCaptura"] = fecha;
        newdocument["fechaActualizacion"] = fecha;
        let Spic = new spic(newdocument);
        let result = await Spic.save();
        let id_result = result._id;
        if (
          newdocument.segundoApellido == null ||
          newdocument.segundoApellido == "" ||
          newdocument.segundoApellido == "undefined"
        ) {
          newdocument["segundoApellido"] = false;
        }
        let objResponse = {};
        objResponse["results"] = result;
        // Buscamos la informacion del usuario que registra en SPIC
        let datausuario = await User.findById(usuario);
        const proveedorRegistros1 = new proveedorRegistros({
          proveedorId: datausuario.proveedorDatos,
          registroSistemaId: result._id,
          sistema: "S2",
          fechaCaptura: fecha,
          fechaActualizacion: fecha,
        });
        let resp = proveedorRegistros1.save();

        //// Reestructurar el registro recien insertado en SPIC, reestructurar y actualizar
        _v = result.__v;
        _id = result._id;
        fechaCaptura = fecha;
        fechaActualizacion = fecha;
        delete result.__v;
        delete result._id;
        delete result.fechaCaptura;
        delete result.fechaActualizacion;

       /*  console.log("_id");
        console.log(_id);
 */
        let metadatos = {
          _id,
          _v,
          fechaCaptura,
          fechaActualizacion,
        };

        data = result;

        /* Insertar objeto spic con metadatos */
        /* let SpicMeta = new spicMeta({metadatos,data});
        let resultMeta = await SpicMeta.save(); */

        console.log("antes de buscar ");
        
        // Suponiendo que 'nuevosValores' contiene los valores de spicMeta que deseas actualizar
        /* Busca pero no permite editar  */
          let documento = await spic.findOne({ _id: new ObjectId(_id) }).lean();
        if (!documento) {
          //console.log('Documento no encontrado.');
          return res.status(404).json({ message: 'Documento no encontrado.' });
        } 
          /* Busca pero no permite editar  */

    
        // Elimina las propiedades que deseas antes de actualizar el documento
          
        //delete documento._id;  
        delete documento.fechaCaptura;
        delete documento.fechaActualizacion;
        delete documento.ejercicio;
        delete documento.nombres;
        delete documento.primerApellido;
        delete documento.segundoApellido;
        delete documento.curp;
        delete documento.rfc;
        delete documento.sexo;
        delete documento.entePublico;
        delete documento.empleoCargoComision;        
        delete documento.observaciones;
        delete documento.__v;         
        
        documento.metadatos = metadatos;
        documento.data = data;
        console.log("documento");
        console.log(documento.data);

        spicMeta.replaceOne({ _id: new ObjectId(documento._id) }, documento, { upsert: true }, function (err, doc) {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Error al actualizar el documento.', error: err.message });
          }
          console.log("Document updated");
        });
       

        /* Actualiza el documento de mongodb pero solo agrega data(result) y metadata */
        /* const documentoActualizado = await spicMeta.findOneAndUpdate(
          { _id: new ObjectId(documento._id) },
          { $set: { metadatos, data } },
          { new: true }
        ); */

       // console.log('Documento actualizado:', documentoActualizado);
        res.status(200).json({
          status: true,
          message: 'Otro endpoint del s2 está para insertar está funcionando correctamente!',
        });

        console.log("despues de buscar ");

        /* Termina la fucnion insertar en la coleccion */
      }
    } catch (error) {
      console.error('Error al actualizar el documento:', error);
      return res.status(500).json({ message: 'Error al actualizar el documento.', error: error.message });
    
      //console.error('Error al crear usuario:', error);
/*       return res
        .status(500)
        .json({ message: "Error al crear usuario.", error: error.message });
*/
    } 
  },
  getAllS2v2: async (req, res) => {
    try {
      /* const registros = await spic.find().exec();
      res.status(200).json(registros); */
      let sortObj = req.body.sort === undefined ? {} : req.body.sort;
      let page = req.body.page === undefined ? 1 : req.body.page; //numero de pagina a mostrar
      let pageSize = req.body.pageSize === undefined ? 10 : req.body.pageSize;
      let query = req.body.query === undefined ? {} : req.body.query;
      console.log({ page: page, limit: pageSize, sort: sortObj });
      const paginationResult = await spic
        .paginate(query, { page: page, limit: pageSize, sort: sortObj })
        .then();
      let objpagination = {
        hasNextPage: paginationResult.hasNextPage,
        page: paginationResult.page,
        pageSize: paginationResult.limit,
        totalRows: paginationResult.totalDocs,
      };
      let objresults = paginationResult.docs;

      let objResponse = {};
      objResponse["pagination"] = objpagination;
      objResponse["results"] = objresults;

      res.status(200).json(objResponse);
    } catch (error) {
      //console.error('Error al crear usuario:', error);
      return res
        .status(500)
        .json({ message: "Error al crear usuario.", error: error.message });
    }
  },
  listS2v2: async (req, res) => {
    try {
      let idUser = req.body.idUser;
      //let usuario = await User.findById(req.body.usuario);
      let usuario = await User.findById(idUser);
      let proveedorDatos = usuario.proveedorDatos;
      let sistema = "S2";
      const result = await proveedorRegistros
        .find({ sistema: sistema, proveedorId: proveedorDatos })
        .then();
      let arrs2 = [];
      _.map(result, (row) => {
        arrs2.push(row.registroSistemaId);
      });
      //console.log("arrs2");
      //console.log(arrs2);
      //// Paginacion del listado de registros
      let sortObj = req.body.sort === undefined ? {} : req.body.sort;
      let page = req.body.page === undefined ? 1 : req.body.page; //numero de pagina a mostrar
      let pageSize = req.body.pageSize === undefined ? 10 : req.body.pageSize;
      let query = req.body.query === undefined ? {} : req.body.query;

      if (!query._id) {
        if (arrs2.length > 0) {
          query = { ...query, _id: { $in: arrs2 } };
        } else {
          query = { _id: { $in: arrs2 } };
        }
      }

      const paginationResult = await spic
        .paginate(query, { page: page, limit: pageSize, sort: sortObj })
        .then();
      let objpagination = {
        hasNextPage: paginationResult.hasNextPage,
        page: paginationResult.page,
        pageSize: paginationResult.limit,
        totalRows: paginationResult.totalDocs,
      };
      let objresults = paginationResult.docs;

      let objResponse = {};
      objResponse["pagination"] = objpagination;
      objResponse["results"] = objresults;

      res.status(200).json(objResponse);
    } catch (error) {
      //console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: error.message });
    }
  },
  updateS2v2: async (req, res) => {
    try {
      // Se obtiene el id del usuario que esta realizando la peticion
      const id = req.body._id;
      //console.log(id);
      // Se eliminan los campos innecesarios de la solicitud
      delete req.body._id;
      // Se obtiene el nuevo documento a actualizar
      let newdocument = req.body;
      // Se establece la fecha de actualización
      newdocument["fechaActualizacion"] = moment()
        .tz("America/Mexico_City")
        .format();
      // Se instancia el modelo de la colección de spic
      //let Spic = S2.model('Spic', nuevoS2Schema, 'spic');
      // Se actualiza el documento
      const response = await spic
        .findByIdAndUpdate(id, newdocument, { upsert: false, new: true })
        .exec();

      // Se devuelve la respuesta
      //res.status(200).json({ code: '200', message: 'Actualizando desde s2v2', id, newdocument });
      res.status(200).json(response);
      //res.status(200).json({message:"todo bien", code:200})
    } catch (error) {
      //console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: error.message });
    }
  },
};
