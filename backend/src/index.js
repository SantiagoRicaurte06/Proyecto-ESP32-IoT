import { config, validarConfig } from "./config.js";
import { conectarMqtt } from "./estacion.js";
import { iniciarServidor } from "./servidor.js";

validarConfig();
console.log(`Centinela Cravo Sur · backend · estación ${config.estacion}`);
conectarMqtt();
iniciarServidor();
