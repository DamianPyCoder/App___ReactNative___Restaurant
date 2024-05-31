const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

// Crea y firma un JWT
const crearToken = (usuario, secreta, expiresIn) => {
    // console.log(usuario);
    const { id, email, nombre } = usuario;

    return jwt.sign( { id, email, nombre }, secreta, { expiresIn } );
}


const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({ creador: ctx.usuario.id });

            return proyectos;
        },
        obtenerTareas: async (_, {input}, ctx) => {
            const tareas = await Tarea.find({ creador: ctx.usuario.id }).where('proyecto').equals(input.proyecto);

            return tareas;
        }
    }, 
    Mutation: {
        crearUsuario: async (_, {input}) => {
            const { email, password} = input;

            const existeUsuario = await Usuario.findOne({ email });

            // si el usuario existe
            if(existeUsuario) {
                throw new Error('El  usuario ya esta registrado');
            }

            try {

                // Hashear password
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt);

                // Registrar nuevo usuario
                const nuevoUsuario = new Usuario(input);
                // console.log(nuevoUsuario);

                nuevoUsuario.save();
                return "Usuario Creado Correctamente";
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario:  async (_, {input}) => {
            const { email, password} = input;

            // Si el usuario existe
            const existeUsuario = await Usuario.findOne({ email });

            // si el usuario existe
            if(!existeUsuario) {
                throw new Error('El Usuario no existe');
            }

            // Si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if(!passwordCorrecto) {
                throw new Error('Password Incorrecto');
            }

            // Dar acceso a la app
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '4hr' )
            }
        },
        nuevoProyecto: async (_, {input}, ctx) => {
            try {
                const proyecto = new Proyecto(input);

                // asociar el creador
                proyecto.creador = ctx.usuario.id;

                // almacenarlo en la BD
                const resultado = await proyecto.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProyecto: async (_, {id, input}, ctx) => {
            // Revisar si el proyecto existe o no
            let proyecto = await Proyecto.findById(id);

            if(!proyecto) {
                throw new Error('Proyecto no encontrado');
            }

            // Revisar que si la persona que trata de editarlo, es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales para editar');
            }

            // Guardar el proyecto
            proyecto = await Proyecto.findOneAndUpdate({ _id: id}, input, { new: true });
            return proyecto;
        },
        eliminarProyecto: async (_, {id}, ctx) => {
            // Revisar si el proyecto existe o no
            let proyecto = await Proyecto.findById(id);

            if(!proyecto) {
                throw new Error('Proyecto no encontrado');
            }

            // Revisar que si la persona que trata de editarlo, es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales para editar');
            }

            // Eliminar
            await Proyecto.findOneAndDelete({ _id : id });

            return "Proyecto Eliminado";

        },
        nuevaTarea: async (_, {input}, ctx) => {
            try {
                const tarea = new Tarea(input);
                tarea.creador = ctx.usuario.id;
                const resultado = await tarea.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarTarea: async (_, {id, input, estado}, ctx) => {
            // Si la tarea existe o no
            let tarea = await Tarea.findById( id );

            if(!tarea) {
                throw new Error('Tarea no encontrada');
            }

            // Si la persona que edita es el creador
            if(tarea.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales para editar');
            }

            // asignar estado
            input.estado = estado;

            // Guardar y retornar la tarea
            tarea = await Tarea.findOneAndUpdate({ _id : id }, input, { new: true});

            return tarea;
        },
        eliminarTarea: async (_, { id }, ctx) => {
            // Si la tarea existe o no
            let tarea = await Tarea.findById( id );

            if(!tarea) {
                throw new Error('Tarea no encontrada');
            }

            // Si la persona que edita es el creador
            if(tarea.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales para editar');
            }

            // Eliminar
            await Tarea.findOneAndDelete({_id: id});

            return "Tarea Eliminada";
        }
    }
}

module.exports = resolvers;