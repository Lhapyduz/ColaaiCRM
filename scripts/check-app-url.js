const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
