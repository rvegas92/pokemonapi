import express, { Application } from 'express';
import dotenv from 'dotenv';
import routes from './routes/index';
import cors from 'cors'

dotenv.config();

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
