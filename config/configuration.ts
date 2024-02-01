import { isMySQL } from '../src/common/helper/db.helper';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    autoLoadEntities: process.env.DB_AUTO_LOAD_ENTITIES === 'true',
    ...(isMySQL()
      ? {
          connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 60000,
        }
      : {
          ConnectTimeoutMS:
            parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 60000,
        }),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    // expiresIn: process.env.JWT_EXPIRES_IN,
  },
});
