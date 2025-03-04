import express, { Application } from 'express';
import dotenv from 'dotenv';
import routes from './routes/index';
import cors from 'cors'
import * as fs from 'fs';
import { ErrorLog } from './utils/errorlog';

dotenv.config();
var settings: any = { server: { port: 8081 }, database: { } };

if(fs.existsSync('./nssettings.dat')) {
    settings = JSON.parse( fs.readFileSync('./nssettings.dat', 'utf8') )
} else {
    ErrorLog.save('index.ts', 'existsSync(./nssettings.dat)',
    'No se encuentra el archivo de configuración "nssettings.dat" en la raiz de la instalación. ')
}

const app: Application = express();
const bodyParser = require('body-parser')
app.use(express.json());
app.use('/api', routes);

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
